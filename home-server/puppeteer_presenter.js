/*
    Problem: I need to broadcast my nintendo switch video from my PC to Kurento.
    Solution A: RTP streaming + FFMPEG. The issue with this is latency; I can't get it below 1 sec delay.
    Solution B: A WebRTC connection VIA a browser. The issue here is that I can't monitor the process very easily in CLI
    Solution C: A WebRTC connection VIA a chrome headless browser. That way supervisord can keep track of the PID & I
                don't have to search for another WebRTC implementation. Let's see if this works...

    Presenter.js uses puppeteer to control a chrome headless browser that runs an RTC connection. Is this really the
    best way to get a performant & stable WebRTC implementation? Something tells me that I'm an idiot, but here we go
    anyway.

     Edit: Nope... didn't work for some reason. Not able to broadcast video, just websocket messages. Scrap this idea.
*/

const puppeteer = require('puppeteer');
const site = `file://${__dirname}/index.html`;

(async () => {
  const browser = await puppeteer.launch({
        args: [ '--use-fake-ui-for-media-stream' ]
    });
  const page = await browser.newPage();
  console.log(site);
  await page.goto(site);

  await page.evaluate(`main('wss://localhost:8443/handshake')`);

  setInterval(async () => {
    const isAlive = await page.evaluate(`healthCheck()`);
    // await page.screenshot({path: 'heartbeat.png'});
    if (!isAlive) {
      console.log('ERROR OCCURRED: CONNECTION TIMED OUT');
      await browser.close();
      process.exit(1);
    }
  }, 5000);
})();
