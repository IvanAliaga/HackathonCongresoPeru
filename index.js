'use strict';


const PAGE_ACCESS_TOKEN = 'EAAHIs8ySZApkBABxnjGuqt6ombbkXhweQqPXx7KZB72fmYZC1mwpQf8xGoE0ikDWNBWAKRBeP6k8yoVQWhY3ikIO7le0K3mAcEwf3yB2oGNHJ0VWAuNEB5TXQ0ptPiucAPx3yGFJ8cBTsmZBwZAKCMZCvdpeZAifrfpr381EsEgmZAz4s2g1oxbB'

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  AssistantV1 = require('watson-developer-cloud/assistant/v1'),
  app = express().use(bodyParser.json()); // creates express http server

const assistant = new AssistantV1({
  username: 'd9173312-877b-4e8e-a651-b4428b1647f5',
  password: 'RR5kGVED3N4c',
  url: 'https://gateway.watsonplatform.net/assistant/api',
  version: '2018-02-16',
});

// Sets server port and logs message on success
app.listen(process.env.PORT || 80, () => console.log('webhook is listening'));


let context = {};

app.post('/conversation', (req, res) => {
  const { text, context = {} } = req.body;

  const params = {
    input: { text },
    workspace_id:'da95515c-4f2d-4fed-8bb5-cf0386897175',
    context,
  };

  assistant.message(params, (err, response) => {
    if (err) res.status(500).json(err);

    res.json(response);
  });
});

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
    let body = req.body;
  
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {

          //Gets data watson
          let data_watson;
      
          // Gets the body of the webhook event
          let webhook_event = entry.messaging[0];
    
          //console.log(webhook_event);

          // Get the sender PSID
          let sender_psid = webhook_event.sender.id; //save in the DB
          console.log('Sender PSID: ' + sender_psid);

        
          // Check if the event is a message or postback and
          // pass the event to the appropriate handler function
          if (webhook_event.message) {   

           let data_watson = "";
           let text = webhook_event.message.text;
           console.log(text);
           const uri = 'http://localhost/conversation';

           var myJSONObject = { text, context};

           request({
                url: uri,
                headers: { 'Content-Type': 'application/json' },
                method: "POST",
                json: true,
                body: myJSONObject
            }, function (error, response, body){
                context = response.context;
                data_watson = body.output.text[0];
                //console.log("data watson; "+data_watson);
                handleMessage(sender_psid, data_watson);
            });

            //handleMessage(sender_psid, webhook_event.message);        
          
          } else if (webhook_event.postback) {
            handlePostback(sender_psid, webhook_event.postback);
          }
          
      });
  
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }

    // Handles messages events
    function handleMessage(sender_psid, received_message) {
      let response;
      // Creates the payload for a basic text message, which
      // will be added to the body of our request to the Send API
      response = {
        "text": `${received_message}`
      }

      //}
       /*else if (received_message.attachments) {
        // Gets the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "generic",
              "elements": [{
                "title": "Is this the right picture?",
                "subtitle": "Tap a button to answer.",
                "image_url": attachment_url,
                "buttons": [
                  {
                    "type": "postback",
                    "title": "Yes!",
                    "payload": "yes",
                  },
                  {
                    "type": "postback",
                    "title": "No!",
                    "payload": "no",
                  }
                ],
              }]
            }
          }
        }
      } */
      
      // Sends the response message
      callSendAPI(sender_psid, response);    
    }

    // Sends response messages via the Send API
    function callSendAPI(sender_psid, response) {
      // Construct the message body
      let request_body = {
        "recipient": {
          "id": sender_psid
        },
        "message": response
      }

      //console.log("te envio el " + response.text);

      // Send the HTTP request to the Messenger Platform
      request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
      }, (err, res, body) => {
        if (!err) {
          console.log('message sent!')
        } else {
          console.error("Unable to send message:" + err);
        }
      }); 

    }
  
  });

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = 'access_token'
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    //console.log(token);
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }

});