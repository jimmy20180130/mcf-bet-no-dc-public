const moment = require('moment-timezone');

async function process_msg(bot, message, playerid) {
    let placeholders = {
        "%playerid%": playerid,
        "%botname%": bot.username,
        "%botuuid%": bot.uuid,
        "%time%": moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
        "%simple_time%": moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')
    }
    
    for (placeholder of Object.keys(placeholders)) {
        message = message.replaceAll(placeholder, placeholders[placeholder]);
    }

    return message;
}

module.exports = {
    process_msg
}