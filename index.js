const TelegramBot = require('node-telegram-bot-api');
const firebase = require('firebase');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.databaseURL,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
});

const ref = firebase.database().ref();
const sitesRef = ref.child('sites');

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
        chatId: msg.chat.id,
        description: txt,
        date: msg.date,
        status: 'pending',
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// request acknowledgement
bot.onText(/\/noted (.+)/, (msg, match) => {
  // const txt = match[1];
  try {
    // use the attribute reply_to_message to find the original message
    if (msg.reply_to_message) {
      // query for the original message and set status to active
      sitesRef.orderByChild('messageId').equalTo(msg.reply_to_message.message_id).on('child_added', (snapshot) => {
        const originalMsg = snapshot.key;
        const msgRef = sitesRef.child(originalMsg);
        msgRef.update({
          status: 'Active',
        });
      });
    }
  } catch (err) {
    console.log(err);
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
      sitesRef.orderByChild('messageId').equalTo(msg.reply_to_message.message_id).on('child_added', (snapshot) => {
        const reqId = snapshot.key;
        const msgRef = sitesRef.child(reqId);
        msgRef.update({
          status: 'Closed',
        });

        // send a message to confirm request closure
        bot.sendMessage(
          msg.chat.id,
          'Request closed',
          { reply_to_message_id: msg.reply_to_message.message_id },
        );
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// display all active cases
bot.onText(/\/active (.+)/, (msg, match) => {
  // const txt = match[1];
  try {
    // query for all active cases
    sitesRef
      .orderByChild('status')
      .startAt('Active')
      .endAt('Active')
      .on('child_added', (snapshot) => {
        console.log(snapshot.val());
      });
  } catch (err) {
    console.log(err);
  }
});

// display all pending cases
bot.onText(/\/pending (.+)/, (msg, match) => {
  // const txt = match[1];
  try {
    // query for all pending cases
    sitesRef
      .orderByChild('status')
      .startAt('pending')
      .endAt('pending')
      .on('child_added', (snapshot) => {
        console.log(snapshot.val());
      });
  } catch (err) {
    console.log(err);
  }
});

// display all closed cases
bot.onText(/\/closed (.+)/, async (msg, match) => {
  // const txt = match[1];
  try {
    // query for all closed cases
    const abc = await sitesRef
      .orderByChild('status')
      .startAt('Closed')
      .endAt('Closed')
      .once('value');

    // array of closed cases
    const closedReqs = Object.values(abc.val());

    // filter for requests coming from this chat
    const filteredClosedReqs = closedReqs.filter((req) => {
      if (req.chatId) {
        return req.chatId === msg.chat.id;
      }
    });

    // forward all messages referring to closed cases
    filteredClosedReqs.forEach((req, idx) => {
      idx === 0 ? bot.sendMessage(
        msg.chat.id,
        'The following cases have been closed:',
      ) : null;

      bot.sendMessage(
        msg.chat.id,
        'test',
        { reply_to_message_id: req.messageId },
      );
    });
  } catch (err) {
    console.log(err);
  }
});
