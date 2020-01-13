### Instructions
To run locally, simply run `index.js` to start the node server. You will need to have your database set up to collect the data.

Setup notes:
- Use a realtime database when setting up Firebase and populate the `.env` file with your Firebase variables
- Talk to the Telegram `BotFather` and disable privacy (`/setprivacy`) so that the bot can listen in on messages sent in group chats 

### What this bot does
To make a request, a porter can type in his/her usual text. The only change they would need to make is to add `/open` before their message.

```
Before: wheelchair in aisle 3
After: /open wheelchair in aisle 3
```

The bot will take this message as a signal to open a request. It will store the following fields:
- `message_id`
- chatId
- userId
- username
- date
- text

The message id is used to map a particular request to a specific message since any updates to that request are done by replying specifically to that message on Telegram.

Currently, to accept a request, porters often reply to the original message with a short message "Noted". With the Telegram bot, they should reply to the message with `/noted`. The bot will change the status of the request from 'pending' to 'active'. This section works by utilizing the `reply_to_message` attribute in the payload to find the original request.

To close a request, porters often reply to the original message with "Done". With the bot, they just need to reply to the original message with `/done` instead.
