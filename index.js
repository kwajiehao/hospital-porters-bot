const TelegramBot = require('node-telegram-bot-api');
const firebase = require('firebase');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});

const app = firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.databaseURL,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,  
  messagingSenderId: process.env.messagingSenderId,
});

const ref = firebase.database().ref();
const sitesRef = ref.child("sites");

bot.onText(/\/open (.+)/, (msg, match) => {
  console.log(msg);
  console.log(match);
  const txt = match[1];
  try {
    if (msg.text) {
      sitesRef.push().set({
        userId: msg.from.id,
        username: msg.from.username,
        messageId: msg.message_id,
        description: txt,
        date: msg.date,
        status: 'pending',
      });
    }
  } catch(err) {
    console.log(err)
  }
});

// request acknowledgement
bot.onText(/\/noted (.+)/, (msg, match) => {
  console.log(msg);
  console.log(match);
  const txt = match[1];
  try {
    // use the attribute reply_to_message to find the original message
    if (msg.reply_to_message) {
      // query for the original message and set status to active
      sitesRef.orderByChild('messageId').equalTo(msg.reply_to_message.message_id).on('child_added', function(snapshot) {
        const originalMsg = snapshot.key;
        const msgRef = sitesRef.child(originalMsg);
        msgRef.update({
          status: "Active",
        });
      });
    }
  } catch(err) {
    console.log(err)
  }
});

// request closure
bot.onText(/\/close (.+)/, async (msg, match) => {
  console.log(msg);
  console.log(match);
  const txt = match[1];
  try {
    if (msg.reply_to_message) {
      // query for the original message and set status to active
      sitesRef.orderByChild('messageId').equalTo(msg.reply_to_message.message_id).on('child_added', function(snapshot) {
        const reqId = snapshot.key;
        const msgRef = sitesRef.child(reqId);
        msgRef.update({
          status: "Closed",
        });

        // send a message to confirm request closure
        bot.sendMessage(
          msg.chat.id, 
          'Request closed',
          { reply_to_message_id: msg.reply_to_message.message_id },
        );
      });
    }
  } catch(err) {
    console.log(err)
  }
});
