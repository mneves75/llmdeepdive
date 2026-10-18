// The legacy portal's only script. Its banner announces success the moment
// an export is clicked, before the server has answered: the misleading
// banner of lesson 18.4. The export itself loads in a hidden frame after
// data-delay milliseconds, so a failed export leaves the banner in place.
const clock = document.getElementById('clock')
const tick = () => { clock.textContent = new Date().toISOString() }
tick()
setInterval(tick, 50)

for (const button of document.querySelectorAll('button[data-period]')) {
  button.addEventListener('click', () => {
    document.getElementById('banner').textContent = 'Export complete. Your download has started.'
    const period = button.dataset.period
    setTimeout(() => { document.getElementById('exporter').src = '/export?period=' + period }, Number(document.body.dataset.delay))
  })
}

for (const button of document.querySelectorAll('[data-dismiss]')) {
  button.addEventListener('click', () => button.closest('[role=dialog]').remove())
}
