const mineflayer = require('mineflayer');
const fs = require('fs');
let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const { add_bet_task, add_client, process_bet_task, add_bot } = require(`./bet/bet.js`);
const { chat } = require(`./utils/chat.js`);
const { get_player_uuid } = require(`./utils/get_player_info.js`);
const { start_rl, stop_rl } = require(`./utils/readline.js`);
const { process_msg } = require(`./utils/process_msg.js`);
const { mc_error_handler } = require(`./error/mc_handler.js`)
const { start_msg, stop_msg } = require(`./utils/chat.js`);
const { add_msg, discord_console, clear_last_msg, discord_console_2 } = require(`./discord/log.js`);
const { Client, GatewayIntentBits, Collection, Events, Partials, REST, Routes } = require('discord.js');
const { check_codes } = require(`./utils/link_handler.js`);
const { command_records, dc_command_records } = require(`./discord/command_record.js`);
const { bot_on, bot_off, bot_kicked } = require(`./discord/embed.js`);
const { get_user_data_from_dc, remove_user_role, add_user_role, getPlayerRole } = require(`./utils/database.js`);
const { orderStrings, canUseCommand } = require(`./utils/permissions.js`);
const { check_token } = require(`./auth/auth.js`);
const moment = require('moment-timezone');

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    auth: config.bot_args.auth,
    version: config.bot_args.version
};

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = {}
let trade_and_lottery;
let facility;
let auto_warp;
let claim;
let is_on_timeout;
let add_bott;

let bot;
let client;
let is_on = false;

const init_bot = async () => {
    console.log('[INFO] 正在讓 Minecraft 機器人上線...')
    const donate_list = [];
    bot = mineflayer.createBot(botArgs);

    bot.on('message', async (jsonMsg) => {
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf-8'));
        if (/^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(jsonMsg.toString())) {
            const msg = jsonMsg.toString()
            const pattern = /^\[([A-Za-z0-9_]+) -> 您\] .*/;
            const match = pattern.exec(msg);
            if (match) {
                let playerid = match[1];
                if (playerid === bot.username) {return};
                let args = msg.slice(8 + playerid.length);
                const commandName = args.split(' ')[0].toLowerCase();
                for (item of Object.keys(commands)) {
                    if (commands[item].includes(commandName) || item == commandName) {
                        if (require(`./commands/donate.js`).name == commandName || require(`./commands/donate.js`).aliases.includes(commandName) && !donate_list.includes(playerid)) {
                            await command_records(client, playerid, args)
                            donate_list.push(playerid)
                            await chat(bot, `/m ${playerid} ${messages.commands.donate.start_donate}`)
                            const pay_msg_Promise = bot.awaitMessage(/^\[系統\] 您收到了/)
                            const timeout_Promise = new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('timeout');
                                }, 20000);
                            });
                            await Promise.race([pay_msg_Promise, timeout_Promise]).then(async string => {
                                if (string == 'timeout' && donate_list.includes(playerid)) {
                                    await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_timeout}`)
                                    donate_list.shift()
                                    return
                                } else {
                                    const msg = string;
                                    const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
                                    const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*) 村民錠\)/
                                    const ematch = e_regex.exec(msg);
                                    const cmatch = c_regex.exec(msg);

                                    if (ematch) {
                                        let playeridd = ematch[1];
                                        if (!donate_list.includes(playeridd)) {
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.wait_until_no_ppl}`)
                                            donate_list.shift()
                                            return
                                        } else {
                                            let amount = parseInt(ematch[2].split(',').join(''))
                                            if (playeridd === bot.username) {return};
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_e_success.replaceAll('%amount%', amount)}`)
                                            donate_list.shift()
                                        }
                                    } else if (cmatch) {
                                        let playeridd = cmatch[1];
                                        if (!donate_list.includes(playeridd)) {
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.wait_until_no_ppl}`)
                                            donate_list.shift()
                                            return
                                        } else {
                                            let amount = parseInt(cmatch[2].split(',').join(''))
                                            if (playeridd === bot.username) {return};
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_c_success.replaceAll('%amount%', amount)}`)
                                            donate_list.shift()
                                        }
                                    }
                                }
                            })
                        }
                        return
                    }
                }

                bot.chat(`/m ${playerid} 指令不存在`);
            }
        } else if (jsonMsg.toString().startsWith(`[系統] 您收到了 `)) {
            const msg = jsonMsg.toString();
            const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
            const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*) 村民錠\)/
            const ematch = e_regex.exec(msg);
            const cmatch = c_regex.exec(msg);

            if (ematch) {
                let playerid = ematch[1];
                if (donate_list.includes(playerid)) return
                let amount = parseInt(ematch[2].split(',').join(''))

                if (playerid === bot.username) {return};
                if (amount > config.bet.emax || amount < config.bet.emin) {
                    await chat(bot, `/m ${playerid} ${messages.errors.bet.e_over_limit.replaceAll('%emin%', config.bet.emin).replaceAll('%emax%', config.bet.emax)}`);
                    await chat(bot, `/pay ${playerid} ${amount}`)
                    return
                }

                await add_bet_task(bot, playerid, amount, 'emerald');
            } else if (cmatch) {
                let playerid = cmatch[1];
                if (donate_list.includes(playerid)) return
                let amount = parseInt(cmatch[2].split(',').join(''))

                if (playerid === bot.username) {return};
                if (amount > config.bet.cmax || amount < config.bet.cmin) {
                    await chat(bot, `/m ${playerid} ${messages.errors.bet.c_over_limit.replaceAll('%cmin%', config.bet.cmin).replaceAll('%cmax%', config.bet.cmax)}`);
                    await chat(bot, `/cointrans ${playerid} ${amount}`)
                    await chat(bot, playerid)
                    return
                }

                await add_bet_task(bot, playerid, amount, 'coin');
            }
        } else if (jsonMsg.toString().startsWith(`[系統] `) && jsonMsg.toString().toLowerCase().includes(`想要你傳送到 該玩家 的位置`)) {
            let msg = jsonMsg.toString().split(" ")
            let playerid = msg[1]
            if (playerid == 'XiaoXi_YT') { 
                await chat(bot, `/tok`)
            } else {
                await chat(bot, `/tno`)
            }
        } else if (jsonMsg.toString().startsWith(`[系統] `) && jsonMsg.toString().toLowerCase().includes(`想要傳送到 你 的位置`)) {
            let msg = jsonMsg.toString().split(" ")
            let playerid = msg[1]
            if (playerid == 'XiaoXi_YT') { 
                await chat(bot, `/tok`)
            } else {
                await chat(bot, `/tno`)
            }
        }
    });

    bot.on('message', async function (jsonMsg) {
        const textMessage = jsonMsg.toString()
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        const shouldSkipMessage = (textMessage) => {
            if (!config.console.public && /^\[公共\]/.test(textMessage) || /^\[\!\]/.test(textMessage)) return true;
            if (!config.console.trade && /^\[交易\]/.test(textMessage) || /^\[\$\]/.test(textMessage)) return true;
            if (!config.console.chat && /^\[閒聊\]/.test(textMessage) || /^\[\@\]/.test(textMessage)) return true;
            if (!config.console.lottery && /^\[抽獎\]/.test(textMessage) || /^\[\%\]/.test(textMessage)) return true;
            if (!config.console.region && /^\[區域\]/.test(textMessage)) return true;
            if (!config.console.facility && /^\[設施\]/.test(textMessage) || /^\[\!\]/.test(textMessage) || /^\[\*\]/.test(textMessage)) return true;
            if (!config.console.claim && /^\[領地\]/.test(textMessage)) return true;
            if (config.lottery_text && config.lottery_text != "" && textMessage.includes(config.lottery_text.replaceAll(/&[0-9a-f]/gi, ''))) return true
            if (config.trade_text && config.trade_text != "" && textMessage.includes(config.trade_text.replaceAll(/&[0-9a-f]/gi, ''))) return true
            if (config.facility_text && config.facility_text != "" && textMessage.includes(config.facility_text.replaceAll(/&[0-9a-f]/gi, ''))) return true
            if (config.claim_text && config.claim_text != "" && textMessage.includes(config.claim_text.replaceAll(/&[0-9a-f]/gi, ''))) return true

            if (!config.console.system) {
                if (/^\[系統\] 新玩家|系統\] 吉日|系統\] 凶日|系統\] .*凶日|系統\] .*吉日/.test(textMessage)) return true;
                if (/^ \> /.test(textMessage)) return true;
                if (/^\[系統\] .*提供了 小幫手提示/.test(textMessage)) return true;
                if (/^\[系統\] 您的訊息沒有玩家看見/.test(textMessage)) return true;
                if (/^┌─回覆自/.test(textMessage)) return true;
                if (/^.* (has made the advancement|has completed the challenge|has reached the goal)/.test(textMessage)) return true;
                if (/players sleeping$/.test(textMessage)) return true;
                if (/目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)/g.test(textMessage)) return true;
                if (/^\[\?\]/.test(textMessage)) return true;
                if (/^\=\=/.test(textMessage)) return true;
                if (/^\[>\]/.test(textMessage)) return true;
                if (/\[~\]/.test(textMessage)) return true;
            }

            return false;
        };

        if (shouldSkipMessage(textMessage)) return
        
        console.log(jsonMsg.toAnsi())
        add_msg(jsonMsg.json)
    });

    bot.once('spawn', async () => {
        console.log('[INFO] Minecraft 機器人已上線!');
        let botSocket = bot._client.socket;
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            const roundedX = Math.round(bot.entity.position.x);
            const roundedY = Math.round(bot.entity.position.y);
            const roundedZ = Math.round(bot.entity.position.z);
            const string = `【登入時間】${time}\n【連線位址】${botSocket.server ? botSocket.server : botSocket._host}\n【玩家名稱】${bot.username}\n【我的座標】(${roundedX}, ${roundedY}, ${roundedZ})`
            const embed = await bot_on(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
            let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));

            process_bet_task()

            await chat(bot, `[${moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')}] Jimmy Bot 已上線!`)

            is_on_timeout = setTimeout(() => {
                is_on = true;

                new Promise(async (resolve) => {
                    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
                    
                    if (cache.bet.length > 0) {
                        let cache_bet = cache.bet
                
                        for (const item of cache_bet) {
                            const playerid = item.player_id
                            const amount = item.amount
                            const type = item.type
                            await add_bet_task(bot, playerid, amount, type);
                        }
                
                        cache.bet = []
                        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    }
                
                    if (cache.msg.length > 0) {
                        for (const item of cache.msg) {
                            await chat(bot, item);
                        }
                
                        cache.msg = []
                        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    }
                
                    resolve()
                })
            }, 10000);

            const ad = () => {
                trade_and_lottery = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try {
                        if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
                        if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
                    } catch {}
                }, 605000)
        
                facility = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try { if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`) } catch {}
                }, 1805000)
        
                auto_warp = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try { bot.chat(config.warp) } catch {}
                }, 600000)

                claim = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try { bot.chat(config.claim_text) } catch {}
                }, 120000)

                add_bott = setInterval(function () {
                    add_bot(bot)
                }, 1000)
            }

            try {
                if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
                if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
                if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`)
                if (config.claim_text && config.claim_text !== '') bot.chat(config.claim_text)
                if (bot) add_bot(bot)
            } catch {}
    
            setTimeout(() => {
                ad()
            }, 5000)
        } catch (e) {}
    });

    bot.once('login', async () => {
        start_rl(bot)
        check_codes()
        console.log('[INFO] Minecraft 機器人已成功登入伺服器');
        await start_msg(bot)
    });

    bot.once('error', async (err) => {
        console.log(err.message)
        if (err.message == 'read ECONNRESET') {
            bot.end()
        } else {
            console.log(`[ERROR] Minecraft 機器人發生錯誤，原因如下: ${err.message}`)
            is_on = false;
            process.exit(1000)
        }
    })

    bot.once('kicked', async (reason) => {
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
        clearInterval(claim)
        clearTimeout(is_on_timeout)
        clearInterval(add_bott)
        stop_rl()
        stop_msg()
        console.log('[WARN] Minecraft 機器人被伺服器踢出了!');
        console.log(`[WARN] 原因如下: ${reason}`);
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        if (is_on == true) {
            const string = `【踢出時間】${time}\n【踢出原因】${reason}`
            const embed = await bot_kicked(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
        }

        bot.end();
    });

    bot.once('end', async () => {
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
        clearTimeout(is_on_timeout)
        clearInterval(claim)
        clearInterval(add_bott)
        stop_rl()
        stop_msg()
        console.log('[WARN] Minecraft 機器人下線了!');
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        const string = `【下線時間】${time}`
        if (is_on == true) {
            const embed = await bot_off(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
            is_on = false;
        }
        await new Promise(r => setTimeout(r, 5000))
        process.exit(246)
    });
}

process.on("unhandledRejection", async (error) => {
    console.log(error)
    is_on = false;
    process.exit(1)
});

process.on("uncaughtException", async (error) => {
    console.log(error)
    is_on = false;
    process.exit(1)
});

process.on("uncaughtExceptionMonitor", async (error) => {
    console.log(error)
    is_on = false;
    process.exit(1)
});

async function start_bot() {
    console.log('[INFO] 正在開始驗證您的金鑰')
    if (await check_token() == true) {
        console.log('[INFO] 金鑰驗證成功，正在啟動機器人...')
        init_bot()

        let check_bot_token = setInterval(async () => {
            if (!await check_token()) {
                console.log('[WARN] 無法連線至驗證伺服器，機器人將於 10 秒後下線')
                await new Promise(resolve => setTimeout(resolve, 10000));
                clearInterval(check_bot_token)
                process.exit(1)
            }
        }, 600000);

    } else {
        console.log('[ERROR] 驗證失敗，機器人將於 30 秒後重新連線至驗證伺服器')
        await new Promise(resolve => setTimeout(resolve, 30000));
        start_bot()
    }
}

start_bot()