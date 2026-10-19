"""Lesson 17.4: the interpreter contract, run against the subprocess backend.

A microVM backend would take the same request and return the same response;
these tests pin the contract, not the isolation (lesson 17.5 measures that).
"""

import csv
import io
import json
import tempfile
import unittest
from pathlib import Path

from pydantic import ValidationError

from agentlab.fixtures import load_purchases
from agentlab.sandbox.interpreter import InputFile, InterpreterRequest, InterpreterResponse, SubprocessBackend

SUMMARIZE = """
import csv, json
from decimal import Decimal
totals = {}
with open("purchases.csv", newline="") as f:
    for row in csv.DictReader(f):
        amount = Decimal(row["unit_price"]) * int(row["quantity"])
        totals[row["supplier"]] = totals.get(row["supplier"], Decimal("0")) + amount
with open("out/summary.json", "w") as f:
    json.dump({name: str(total) for name, total in sorted(totals.items())}, f)
print("suppliers:", len(totals))
"""


def purchases_csv(tenant: str) -> str:
    rows = [row for row in load_purchases() if row["tenant_id"] == tenant]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["po_id", "supplier", "quantity", "unit_price"], extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def request(code: str, request_id: str = "req-1", files=()) -> InterpreterRequest:
    return InterpreterRequest(request_id=request_id, code=code, files=tuple(files))


class Contract(unittest.TestCase):
    def setUp(self):
        self.backend = SubprocessBackend()

    def test_synthetic_csv_is_summarized(self):
        files = [InputFile(name="purchases.csv", content=purchases_csv("tenant-a"))]
        response = self.backend.run(request(SUMMARIZE, files=files))
        self.assertEqual(response.request_id, "req-1")
        self.assertEqual(response.exit_code, 0, response.stderr)
        self.assertEqual(response.stdout, "suppliers: 3\n")
        [summary] = response.artifacts
        self.assertEqual(summary.name, "summary.json")
        self.assertEqual(
            json.loads(summary.content),
            {"Supplier Alpha": "1634.00", "Supplier Beta": "780.00", "Supplier Gamma": "10000.00"},
        )

    def test_the_response_survives_the_wire(self):
        # A microVM backend sends this as JSON over a socket; nothing may change on the way.
        response = self.backend.run(request("open('out/a.bin', 'wb').write(bytes(range(256)))"))
        again = InterpreterResponse.model_validate_json(response.model_dump_json())
        self.assertEqual(again, response)
        self.assertEqual(again.artifacts[0].content, bytes(range(256)))

    def test_input_names_cannot_leave_the_workspace(self):
        for name in ["../escape.csv", "/etc/passwd.csv", "sub/dir.csv", "main.py"]:
            with self.subTest(name=name), self.assertRaises(ValidationError):
                InputFile(name=name, content="a,b\n")

    def test_artifact_count_and_total_size_are_bounded(self):
        code = "for i in range(10):\n    open(f'out/part-{i}.txt', 'w').write('x' * 1000)"
        by_count = SubprocessBackend(max_artifacts=3).run(request(code))
        self.assertEqual([a.name for a in by_count.artifacts], ["part-0.txt", "part-1.txt", "part-2.txt"])
        self.assertEqual(len(by_count.rejected), 7)
        by_size = SubprocessBackend(max_artifact_bytes=2_500).run(request(code))
        self.assertEqual([a.name for a in by_size.artifacts], ["part-0.txt", "part-1.txt"])
        self.assertEqual(len(by_size.rejected), 8)


class HostileOutputs(unittest.TestCase):
    def setUp(self):
        self.host = tempfile.TemporaryDirectory()
        self.secret = Path(self.host.name) / "host-secret.txt"
        self.secret.write_text("host-only data\n", encoding="utf-8")

    def tearDown(self):
        self.host.cleanup()

    def test_a_symlinked_artifact_is_not_followed(self):
        code = f"import os\nos.symlink({str(self.secret)!r}, 'out/leak.txt')\nopen('out/ok.txt', 'w').write('fine')"
        response = SubprocessBackend().run(request(code))
        self.assertEqual([a.name for a in response.artifacts], ["ok.txt"])
        self.assertTrue(any(r.startswith("leak.txt:") for r in response.rejected))

    def test_a_fifo_left_in_the_output_cannot_hang_collection(self):
        response = SubprocessBackend().run(request("import os\nos.mkfifo('out/pipe')"))
        self.assertEqual(response.artifacts, ())
        self.assertEqual(response.rejected, ("pipe: not a regular file",))

    def test_an_output_directory_replaced_by_a_symlink_yields_nothing(self):
        code = f"import os\nos.rmdir('out')\nos.symlink({self.host.name!r}, 'out')"
        response = SubprocessBackend().run(request(code))
        self.assertEqual(response.artifacts, ())
        self.assertEqual(response.rejected, ("out: not a directory",))
