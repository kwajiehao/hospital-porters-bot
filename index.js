// imports
const TelegramBot = require('node-telegram-bot-api');
const firebase = require('firebase');
const Bluebird = require('bluebird');

// internal imports
const { getTimestamp } = require('./utils');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.databaseURL,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
});

const ref = firebase.database().ref();
const sitesRef = ref.child('sites');

// open a request
bot.onText(/\/open(.*)/, (msg, match) => {
  try {
    if (msg.text) {
      sitesRef.push().set({
        chatId: msg.chat.id,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        date: msg.date,
        description: match[1].trim(),
        hasImage: false,
        messageId: msg.message_id,
        status: 'Pending',
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        userId: msg.from.id,
        username: msg.from.username,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// if the message has a photo we need to detect it separately
bot.on('message', (msg) => {
  try {
    if (msg.photo) {
      // match caption to /open slash command
      const match = msg.caption.match(/\/open(.*)/)
      if (match) {
        sitesRef.push().set({
          chatId: msg.chat.id,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          date: msg.date,
          description: match[1].trim(),
          hasImage: true,
          messageId: msg.message_id,
          status: 'Pending',
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
          userId: msg.from.id,
          username: msg.from.username,
        });
      }
    }
  } catch(err) {
    console.log(err);
  }
});


// request acknowledgement
bot.onText(/\/noted(.*)/, (msg, match) => {
  try {
    // use the attribute reply_to_message to find the original message
    if (msg.reply_to_message) {
      // query for the original message and set status to active
      sitesRef.orderByChild('messageId').equalTo(msg.reply_to_message.message_id).on('child_added', (snapshot) => {
        const originalMsg = snapshot.key;
        const msgRef = sitesRef.child(originalMsg);

        // updates with the responder's username
        msgRef.update({
          status: 'Active',
          responderId: msg.from.id,
          responderUsername: msg.from.username,
          notedAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
        });
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// request closure
bot.onText(/\/close(.*)/, async (msg, match) => {
  try {
    if (msg.reply_to_message) {
      // query for the original message and set status to active
      sitesRef.orderByChild('messageId').equalTo(msg.reply_to_message.message_id).on('child_added', (snapshot) => {
        const message = snapshot.val();
        const reqId = snapshot.key;
        const msgRef = sitesRef.child(reqId);

        // only update if user created the request or responded to the request
        if (msg.from.id === message.userId || msg.from.id === message.responderId) {
          msgRef.update({
            closedAt: firebase.database.ServerValue.TIMESTAMP,
            closedBy: msg.from.id,
            closedByUsername: msg.from.username,
            status: 'Closed',
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
          });
  
          // send a message to confirm request closure
          bot.sendMessage(
            msg.chat.id,
            'Request closed',
            { reply_to_message_id: msg.reply_to_message.message_id },
          );
        } else {
          // send a message to deny request closure
          bot.sendMessage(
            msg.chat.id,
            'Only those involved in the request may close it',
            { reply_to_message_id: msg.reply_to_message.message_id },
          );
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// display all active cases
bot.onText(/\/active(.*)/, async (msg, match) => {
  try {
    // query for all active cases
    const activeReqsObj = await sitesRef
      .orderByChild('status')
      .startAt('Active')
      .endAt('Active')
      .once('value');
    
    // array of active cases
    const activeReqs = Object.values(activeReqsObj.val());

    // forward all messages referring to closed cases
    Bluebird.each(activeReqs, async (req, idx) => {
      idx === 0 ? await bot.sendMessage(
        msg.chat.id,
        'The following cases are active:',
      ) : null;

      await bot.sendMessage(
        msg.chat.id,
        `Active case ${idx}`,
        { reply_to_message_id: req.messageId },
      );
    });

  } catch (err) {
    console.log(err);
  }
});

// display all pending cases
bot.onText(/\/pending(.*)/, async (msg, match) => {
  // const txt = match[1];
  try {
    // query for all pending cases
    const pendingReqsObj = await sitesRef
      .orderByChild('status')
      .startAt('Pending')
      .endAt('Pending')
      .once('value');
    
    if (pendingReqsObj.val()) {
      // array of active cases
      const pendingReqs = Object.values(pendingReqsObj.val());

      // forward all messages referring to closed cases
      Bluebird.each(pendingReqs, async (req, idx) => {
        idx === 0 ? await bot.sendMessage(
          msg.chat.id,
          'The following cases are pending:',
        ) : null;

        await bot.sendMessage(
          msg.chat.id,
          `Pending case ${idx}`,
          { reply_to_message_id: req.messageId },
        );
      });
    } else if (pendingReqsObj.val() === null) {
      bot.sendMessage(
        msg.chat.id,
        'There are no pending cases',
      );
    }
  } catch (err) {
    console.log(err);
  }
});

// display all closed cases
bot.onText(/\/closed(.*)/, async (msg, match) => {
  try {
    // query for all closed cases
    const closedReqsObj = await sitesRef
      .orderByChild('status')
      .startAt('Closed')
      .endAt('Closed')
      .once('value');

    // array of closed cases
    const closedReqs = Object.values(closedReqsObj.val());

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
        'The following cases are closed:',
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

bot.onText(/\/casesClosedToday(.*)/, async (msg, match) => {
  try {
    const timestamp = getTimestamp(match[1].trim())
    // query for all cases starting from today
    const todayReqsObj = await sitesRef
      .orderByChild('createdAt')
      .startAt(timestamp)
      .once('value');

    if (todayReqsObj.val()) {
      // array of active cases
      const todayReqs = Object.values(todayReqsObj.val());

      // forward all messages referring to closed cases
      Bluebird.each(todayReqs, async (req, idx) => {
        idx === 0 ? await bot.sendMessage(
          msg.chat.id,
          'The following cases are from today:',
        ) : null;

        await bot.sendMessage(
          msg.chat.id,
          `Case number ${idx} of today`,
          { reply_to_message_id: req.messageId },
        );
      });
    } else if (todayReqsObj.val() === null) {
      bot.sendMessage(
        msg.chat.id,
        'There are no cases today',
      );
    }

  } catch(err) {
    console.log(err);
  }
})

// displays error messages
bot.on("polling_error", (err) => console.log(err));