//Please see these docs: https://open-wa.github.io/wa-automate-nodejs/classes/client.html#middleware

// import { create, Client } from '@open-wa/wa-automate';
import { create, Client } from '../src/index';
const axios = require('axios').default;

const { default: PQueue } = require("p-queue");
const queue = new PQueue({ concurrency: 5 });

const express = require('express');
const app = express();
app.use(express.json());
const PORT = 8082;

//Create your webhook here: https://webhook.site/
const WEBHOOK_ADDRESS = 'PASTE_WEBHOOK_DOT_SITE_UNIQUE_URL_HERE'

async function fire(data){
    return await axios.post(WEBHOOK_ADDRESS, data)
}

const wh = event => async (data) => {
    const ts = Date.now();
    return await queue.add(()=>fire({
        ts,
        event,
        data
    }))
}

async function start(client:Client){
  app.use(client.middleware);
  client.onAck(wh('ack'))
  client.onAnyMessage(wh('any_message'))
  client.onMessage(wh('message'))

  //requires a group id
  //   client.onParticipantsChanged(wh('message'))
  client.onAddedToGroup(wh('added_to_group'))
  client.onBattery(wh('battery'))
  client.onContactAdded(wh('contact_added'))
  client.onIncomingCall(wh('incoming_call'))
  client.onPlugged(wh('plugged'))
  client.onStateChanged(wh('state'))

  //this is only for insiders
  client.onRemovedFromGroup(wh('removed_from_group'))

  app.listen(PORT, function () {
    console.log(`\n• Listening on port ${PORT}!`);
  });
}

create({
    sessionId:'session-new',
    headless: false,
    qrTimeout: 600,
    authTimeout: 60,
    multiDevice: false,
    disableSpins: true,
    inDocker: true,
    autoRefresh: true,
    cacheEnabled: false,
    killProcessOnTimeout: false,
    killProcessOnBrowserClose: false,
    // sets restartOnCrash to the above `start` function
//    licenseKey: '80FCACAB-D8604462-88BD85DD-0229B2F5',
    customUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36'
})
  .then(async client => await start(client))
  .catch(e=>{
    console.log('Error',e.message);
  });
