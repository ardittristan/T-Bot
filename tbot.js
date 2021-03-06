//! Imports
import sqlite3 from "sqlite3";
const { Database, OPEN_READWRITE, OPEN_CREATE } = sqlite3;
import Discord from "discord.js";
import GetNextDate from "get-next-date";
import GetMidnighDate from "get-midnight-date";
import sample from "lodash.sample";
import { existsSync, mkdirSync, unlinkSync, readFileSync } from "fs";
import { execSync } from "child_process";
import imagesDownloader from "images-downloader";
const imageDownload = imagesDownloader.images;
import sharp from "sharp";
import emojiExists from "emoji-exists";
import twemojiParser from "twemoji-parser";
const twemojiParse = twemojiParser.parse;
import svg2img from "svg2img";
import { convertDelayStringToMS, createRichEmbed } from "./libs/draglib.js";
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], disabledEvents: ['TYPING_START'] });
const config = JSON.parse(readFileSync("./config.json", "utf-8"));
var quotes = JSON.parse(readFileSync("./quotes.json", "utf8"));
import googleSpreadsheet from "google-spreadsheet";
const { GoogleSpreadsheet } = googleSpreadsheet;
const doc = new GoogleSpreadsheet(config.spreadsheetid);
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

//* Attachments
const hazeImg = new Discord.MessageAttachment("https://i.imgur.com/ahU3Ke0.png", "Haze.png");
const bulliImg = new Discord.MessageAttachment("https://cdn.discordapp.com/attachments/659472253913661458/665701475426631698/unknown.png", "StopBulli.png");
const eclairImg = new Discord.MessageAttachment("https://cdn.discordapp.com/attachments/656761226004791298/669289619258605578/eclair.png", "Eclair.png");





//! Globar vars
/** @type {number} */
const pLength = config.prefix.length;
/** @type {Discord.TextChannel} */
var logChannel;
/** @type {Discord.TextChannel} */
var deletedChannel;
/** @type {Discord.Guild} */
var guild;
var activeUsers = 1;
//* percentage of active needed for star + 1
var starDevider = 0.175;
//* amount of time passed without message to be considered inactive
var activeTime = 3600000;
var starActive = false;
var bdaySheet;
var daysSince1970Sheet;
//* percent of server users needed for sucessful invite
// var invitePercent = 0.10;
//* pixel size of jumbo emotes
var jumboSize = 128;
// var hazeAmount = 0;




//! Init temp folder
if (!existsSync("./tmp")) {
    mkdirSync("./tmp");
}


//! Init database
if (!existsSync("./db")) {
    mkdirSync("./db");
}
let db = new Database("./db/database.db", OPEN_READWRITE | OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("connected to Main db");
    //* creates table for reminders
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Reminders" ("DateTime" INTEGER NOT NULL, "UserId" TEXT NOT NULL, "Reminder" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for campaign role
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Campaign" ("UserId" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for activity level
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Activity" ("DateTime" INTEGER NOT NULL, "UserId" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for already starred messages
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Starred" ("MessageId" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for bot status
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Status" ("Type" TEXT NOT NULL, "Message" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
});
let messageDB = new Database("./db/messages.db", OPEN_READWRITE | OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("connected to Message db");
    //* creates table for messages
    messageDB.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Messages" ("Word" TEXT, "Count" INTEGER)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
});





//! Startup code

client.login(config.token);

client.on("ready", () => {

    guild = client.guilds.resolve(config.guildid);
    logChannel = guild.channels.resolve(config.logchannel);
    deletedChannel = guild.channels.resolve(config.deletelogchannel);

    inviteCheck();
    remindCheck();
    activeUserCheck();
    setStatus(undefined, undefined, true);
    // invitePercentageInfo();
    console.log("Booted");
});



//! Commands
client.on("message", async (message) => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    const args = message.content.slice(pLength).trim().split(/ +/g);
    const command = args.shift().toLocaleLowerCase();
    const authr = message.author;

    switch (command) {

        case "help":
            //* list commands
            //#region
            message.channel.send(
                "```" +
                "Commands:\n\n" +
                ".help\n -you're here, smh\n\n" +
                ".rename <name>\n -if put in general chat it renames the channel name\n\n" +
                ".rename <name>\n -if put in vc talk it renames the voice channel you're currently in\n\n" +
                ".haze\n -haze\n\n" +
                ".playing <status>\n.watching <status>\n.listening <status>\n -sets the status of the bot\n\n" +
                ".botrole <name>\n -sets bot role name\n\n" +
                ".addgame <name>\n -adds game role\n\n" +
                ".remind <wdhm> <message>\n -adds reminder in set amount of time, example: .remind 4d2m <message>\n\n" +
                ".toggleregion\n -toggles the voice region between europe and russia\n\n" +
                ".disconnect\n -disconnects you from your current vc channel\n\n" +
                ".eventannounce <wdhm> <message>\n -adds announcement to #announcements with provided timestamp, example: .announce 1w one week later...\n\n" +
                ".rolewho <roleid/role number>\n -shows members that have the role\n\n" +
                ".birthday\n -posts link to birthday list\n\n" +
                ".messageinfo\n -shows graph with word counts\n\n" +
                ".jumbo <emoji>\n -makes emoji big" +
                "```"
            ).then(message =>
                message.delete({ timeout: 30000 })
            );
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "reload":
            //#region
            quotes = JSON.parse(readFileSync("./quotes.json", "utf8"));
            break;
        //#endregion

        case "rename":
            //* voice channel rename
            //#region
            if (message.channel.id === config.vctalk && message.member.voice.channel != undefined) {
                if (message.member.voice.channel.parentID === config.vccategory) {
                    message.member.voice.channel.setName(message.content.slice(pLength + 6).trim());
                    config.voiceroles.forEach(array => {
                        if (array[0] == message.member.voice.channelID) {
                            guild.roles.fetch(array[1]).then(role => { role.edit({ name: message.content.slice(pLength + 6).trim() }); });
                        }
                    });
                    logChannel.send(`${authr}` + " set voice channel name to: `" + message.content.slice(pLength + 6).trim() + "`");
                }
            }

            else {
                //* general channel rename
                config.renamable.forEach(function (entry) {
                    if (message.channel.id === entry) {
                        message.channel.setName(message.content.slice(pLength + 6).trim());
                        logChannel.send(`${authr}` + " set " + message.channel.name + " name to: `" + message.content.slice(pLength + 6).trim() + "`");
                    }
                });
            }

            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "invite":
            //* create invite link
            //#region
            if (message.channel.id === config.invitechannel) {
                message.delete();
                message.channel.createInvite({ maxAge: 0, maxUses: 1, unique: true, temporary: true }).then(invite =>
                    message.author.send(invite.url)
                );
                logChannel.send(`${authr}` + " made an invite");
            }
            break;
        //#endregion

        case "haze":
            //* haze
            //#region
            message.channel.send(hazeImg);
            break;
        //#endregion

        case "playing":
            //* playing status
            //#region
            setStatus("PLAYING", message.content.slice(pLength + 7).trim());
            logChannel.send(`${authr}` + " set bot status to: `playing " + message.content.slice(pLength + 7).trim() + "`");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "listening":
            //* bot listening status
            //#region
            setStatus("LISTENING", message.content.slice(pLength + 9).trim());
            logChannel.send(`${authr}` + " set bot status to: `listening to " + message.content.slice(pLength + 9).trim() + "`");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "watching":
            //* bot watching status
            //#region
            setStatus("WATCHING", message.content.slice(pLength + 8).trim());
            logChannel.send(`${authr}` + " set bot status to: `watching " + message.content.slice(pLength + 8).trim() + "`");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "botrole":
            //* changes bot role name
            //#region
            guild.roles.resolve(config.botroleid).setName(message.content.slice(pLength + 7).trim());
            logChannel.send(`${authr}` + " set bot role name to: `" + message.content.slice(pLength + 7).trim() + "`");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "addhaze":
            //* adds haze role
            //#region
            if (message.channel.id === config.adddefaultchannel && message.mentions.members.first()) {
                message.mentions.members.first().roles.add(config.defaultrole);
                client.channels.resolve(config.defaultchannel).send(message.mentions.members.first(), hazeImg);
            }
            else if (message.channel.id === config.adddefaultchannel) {
                //* if no input lists users without haze
                var output = "**Members without haze:**\n";
                var length = message.guild.members.cache.array().length;
                var i = 0;
                message.guild.members.cache.forEach(function (member) {
                    if (!member.roles.cache.has(config.defaultrole) && !member.user.bot) {
                        output = output + `${member}` + " `" + member.id + "`\n";
                    }
                    i++;
                    if (i === length) {
                        client.channels.resolve(config.adddefaultchannel).send(output);
                    }
                });
            }
            break;
        //#endregion

        case "addgame":
            //* adds pingable game role
            //#region
            guild.roles.create({ data: { name: message.content.slice(pLength + 7).trim(), mentionable: true, position: (await guild.roles.fetch(config.defaultrole)).rawPosition - 1 } });
            logChannel.send(`${authr}` + " added game role: `" + message.content.slice(pLength + 7).trim() + "`");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "stopbulli":
            //* send img
            //#region
            message.channel.send(bulliImg);
            break;
        //#endregion

        case "eclair":
            //* send img
            //#region
            message.channel.send(eclairImg);
            break;
        //#endregion

        case "remindme":
        case "reminder":
        case "rem":
        case "remind":
            //* reminder tool
            //#region
            var arg = message.content.substr(message.content.indexOf(' ') + 1).trim();
            var delayString = arg.substr(0, arg.indexOf(" "));
            var delay = new Date(Date.now() + convertDelayStringToMS(delayString));
            if (delay) {
                var reminder = arg.substr(delayString.length).trim();
                var author = authr.id;
                db.run(/*sql*/`INSERT INTO Reminders VALUES (?, ?, ?)`, [delay, author, reminder]);
                message.channel.send("You have set a reminder for: `" + delay.toISOString().replace(/T/, " ").replace(/\..+/, " British Time`"));
            }
            break;
        //#endregion

        case "toggleregion":
            //* toggles region between russia and europe
            //#region
            if (guild.region === "europe") {
                guild.setRegion("russia");
            } else {
                guild.setRegion("europe");
            }
            logChannel.send(`${authr}` + " toggled the server region");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "disconnect":
            //* disconnects user from current connected voice channel
            //#region
            if (message.member.voice.channel != undefined) {
                guild.members.resolve(authr.id).voice.setChannel(null);
            }
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "addcampaign":
            //* adds campaign role to someone
            //#region
            if (message.member.roles.cache.has(config.gmrole) || authr.id == guild.ownerID) {
                db.run(/*sql*/`INSERT INTO Campaign VALUES (?)`, [message.mentions.members.first().id]);
                message.mentions.members.first().roles.add(config.campaignrole);
                message.channel.send("Gave user campaign role.");
            }
            break;
        //#endregion

        case "removecampaign":
            //* removes campaign role from someone
            //#region
            if (message.member.roles.cache.has(config.gmrole) || authr.id == guild.ownerID) {
                if (await campaignRole(message.mentions.members.first(), true)) {
                    message.channel.send("Removed campaign role from user.");
                };
            }
            break;
        //#endregion

        case "dndannounce":
            //* creates rich embed and announces for dnd announcements
            //#region
            if (message.channel.id === config.logchannel) {
                var day = 7;
                day = args[0];
                var text = message.content.slice((args[0].length + args[1].length + 14)).trim();
                switch (day) {
                    case "mon":
                        day = 1;
                        break;
                    case "tue":
                        day = 2;
                        break;
                    case "wed":
                        day = 3;
                        break;
                    case "thu":
                        day = 4;
                        break;
                    case "fri":
                        day = 5;
                        break;
                    case "sat":
                        day = 6;
                        break;
                    case "sun":
                        day = 0;
                        break;
                    case "now":
                        day = 8;
                        break;
                }
                if (day === 7) { message.channel.send("Error"); return; }
                var date = new Date(Date.now());
                if (day === 8) {
                    date = GetMidnighDate(date);
                } else {
                    var ongoing = true;
                    while (ongoing) {
                        date = GetNextDate(date);
                        if (date.getDay() === day) {
                            ongoing = false;
                        }
                    }
                }
                var time = args[1].split(":");
                var hour = parseInt(time[0]);
                if (hour >= 24) { hour = 0; };
                var minute = 0;
                if (time.length === 2) { minute = parseInt(time[1]); }
                if (minute >= 60) { minute = 0; }
                date.setHours(hour + 1, minute);
                var embed = new Discord.MessageEmbed()
                    .setTimestamp(date);
                guild.channels.resolve(config.dndannounce).send(text, { embed: embed });
            }
            break;
        //#endregion

        case "eventannounce":
            //* makes announcement
            //#region
            var arg = message.content.slice(pLength + 13).trim();
            var delayString = arg.substr(0, arg.indexOf(" "));
            var timeNow = Date.now();
            var time = new Date(timeNow + convertDelayStringToMS(delayString));
            var messageText = "";
            if (time.valueOf() === timeNow) {
                messageText = arg;
            } else {
                messageText = arg.substr(delayString.length).trim();
            }
            if (time && (!(messageText === "") || !(delayString === ""))) {
                var embed = new Discord.MessageEmbed()
                    .setTimestamp(time)
                    .setDescription(messageText + "\n");
                guild.channels.resolve(config.announcements).send(embed);
            }
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "rolewho":
            //#region
            /** @type {string} */
            var roleId;
            var arg = message.content.slice(pLength + 7).trim();
            if (arg.includes(" ")) {
                roleId = arg.substr(0, arg.indexOf(" "));
            } else {
                roleId = arg;
            }
            if (!(roleId === "")) {
                if (roleId.length < 16) {
                    var rolecount = message.guild.roles.size - 2;
                    message.guild.roles.cache.forEach(role => {
                        if (role.position === (rolecount - roleId)) {
                            var memberlist = role.name + "\n```";
                            role.members.forEach(memberId => {
                                memberlist = memberlist.concat(memberId.user.username + "#" + memberId.user.discriminator + "\n");
                            });
                            message.channel.send(memberlist + "```", { disableEveryone: true });
                        }
                    });
                } else
                    if (roleId.length === 18) {
                        var role = await message.guild.roles.fetch(roleId).catch(err => { return; });
                        var memberlist = role.name + "\n```";
                        role.members.forEach(memberId => {
                            memberlist = memberlist.concat(memberId.user.username + "#" + memberId.user.discriminator + "\n");
                        });
                        message.channel.send(memberlist + "```", { disableEveryone: true });
                    }
            }
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "birthday":
            //#region
            message.channel.send(new Discord.MessageEmbed().addField(String.fromCharCode(8203), `[Birthday List](${config.birthdayurl})`));
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "messageinfo":
            //#region
            message.channel.send(new Discord.MessageEmbed().setDescription("Only updates when Ardit opens it on pc").addField(String.fromCharCode(8203), `[Message Data](${config.messageurl})`));
            break;
        //#endregion

        // case "invite":
        //     //* creates invite vote
        //#region
            //#region
        //#region
        //     var arg = message.content.slice(pLength + 6).trim();
        //     if (arg != "") {
        //         await message.react('✅');
        //         await message.react('❌');
        //         setTimeout(function () {
        //             if ((messageReaction.count - 1) - ((messageReaction.message.reactions.resolve("❌").count - 1) * 2) >= Math.ceil(guild.memberCount * invitePercent)) {
        //                 message.channel.createInvite({ maxAge: 0, maxUses: 1, unique: true }).then(invite => {
        //                     message.author.send(invite.url);
        //                     message.author.send(message);
        //                 });
        //                 message.delete({ timeout: 1000 });
        //                 message.channel.send(`${arg}'s invite has gone trough`);
        //             }
        //         }, 86400000);
        //     } else {
        //         message.channel.send("Please say who you want to invite").then(botMessage => {
        //             botMessage.delete({ timeout: 10000 });
        //         });
        //         message.delete({ timeout: 1000 });
        //     }
        //     break;
        //#endregion

        case "haze2":
            //* copypasta
            //#region
            message.channel.send(`I've come to make an announcement: HaZe clan are bitch-ass motherfuckers. They pissed on my fucking wife. That's right, they took their little, tiny dicks out and they pissed on my fucking wife and they said their dicks were ***this big*** and I said "that's disgusting!" so I'm making a callout post on my twitter dot com: HaZe clan, you got small dicks. They're the size of Poxy except WAY smaller. And guess what? HERE'S WHAT MY DICK LOOK LIKE ***PFFFFFFFFGJT*** That's right, baby, all point, no quills, no pillows- look at that it looks like two balls and a bong. You fucked my wife so guess what? I'M GONNA FUCK THE EARTH. THAT'S RIGHT, THIS IS WHAT YOU GET, ***MY SUPER LASER PISS!*** Except I'm not gonna piss on the Earth, I'm gonna go HIGHER. I'm pissing on THE MOOOOON! HOW DO YOU LIKE THAT OBAMA? I PISSED ON THE MOON YOU IDIOT! You have twenty three hours before the PISS DRRRRRROPLLLLLETS HIT THE FUCKING EARTH! Now get out of my fucking sight before I piss on you too!`);
            break;
        //#endregion

        case "jumbo":
            //* big emotes
            //#region
            var emojiId = message.content.slice(pLength + 5).trim();
            if (emojiExists(emojiId)) {
                svg2img(twemojiParse(emojiId)[0].url, { width: jumboSize, height: jumboSize, preserveAspectRatio: true }, function (_, buffer) {
                    var attachment = new Discord.MessageAttachment(buffer, "unknown.png");
                    var embed = new Discord.MessageEmbed()
                        .setAuthor(message.author.username, message.author.avatarURL())
                        .attachFiles(attachment)
                        .setImage('attachment://unknown.png');
                    message.channel.send(embed);
                });
            } else
                if (message.content.includes("<a:")) {
                    var emojiId = message.content.match(/(?<=\<a:.*?:)([0-9]*?)(?=\>)/g);
                    if (emojiId != [] && emojiId != null) {
                        imageDownload([`https://cdn.discordapp.com/emojis/${emojiId[0]}.gif`], './tmp').then(result => {
                            execSync(`node "${__dirname}/node_modules/gifsicle/cli.js" --resize-width ${jumboSize} --colors 256 --no-warnings -o ${result[0].filename} ${result[0].filename}`);
                            var attachment = new Discord.MessageAttachment(result[0].filename, 'unknown.gif');
                            var embed = new Discord.MessageEmbed()
                                .setAuthor(message.author.username, message.author.avatarURL())
                                .attachFiles(attachment)
                                .setImage('attachment://unknown.gif');
                            message.channel.send(embed).then(() => {
                                unlinkSync(result[0].filename);
                            });
                        });
                    }
                } else {
                    var emojiId = message.content.match(/(?<=\<:.*?:)([0-9]*?)(?=\>)/g);
                    if (emojiId != [] && emojiId != null) {
                        imageDownload([`https://cdn.discordapp.com/emojis/${emojiId[0]}.png`], './tmp').then(async result => {
                            sharp(result[0].filename).resize(jumboSize).toBuffer().then(image => {
                                var attachment = new Discord.MessageAttachment(image, 'unknown.png');
                                var embed = new Discord.MessageEmbed()
                                    .setAuthor(message.author.username, message.author.avatarURL())
                                    .attachFiles(attachment)
                                    .setImage('attachment://unknown.png');
                                message.channel.send(embed).then(() => {
                                    unlinkSync(result[0].filename);
                                });
                            });
                        });
                    }
                }
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "ban":
            //#region
            message.channel.send(sample(quotes.banQuotes).split("{name}").join(message.content.slice(pLength + 3).trim()));
            break;
        //#endregion
    }
});
//? End of commands




//! Other events

client.on("emojiCreate", async (emoji) => {
    guild.channels.resolve(config.defaultchannel).send("New emoji - " + emoji.toString());
});

client.on("guildMemberUpdate", async (_old, member) => {
    //* checks if user gives themselve the campaign role when they're not allowed to
    //#region
    if (member.roles.cache.get(config.campaignrole)) {
        if (!await campaignRole(member)) {
            member.roles.remove(config.campaignrole);
        }
    };
    //#endregion

    //* checks if user is supposed to have voice role
    //#region
    if (member.voice.channel == undefined) {
        config.voiceroles.forEach(array => {
            if (member.roles.cache.get(array[1])) {
                member.roles.remove(array[1]);
            }
        });
    }
    //#endregion
});

client.on("message", async (message) => {
    //* adds word to list/adds count
    //#region
    let sql = /*sql*/`SELECT    Word,
                                Count,
                                _rowid_ id
                        FROM Messages
                        ORDER BY _rowid_`;
    messageDB.all(sql, [], (err, rows) => {
        if (err) {
            return;
        }
        if (!message.author.bot) {
            message.content.split(" ").forEach(word => {
                word = word.toLowerCase();
                if (!(word.includes("http://") || word.includes("https://") || word === "" || (word.startsWith("<@") && word.endsWith(">")))) {
                    if (word.startsWith("<:") && word.endsWith(">")) {
                        word = word.replace(/[^a-zA-Z]/g, "");
                    }
                    if (word.startsWith("<a:") && word.endsWith(">")) {
                        word = word.slice(2).replace(/[^a-zA-Z]/g, "");
                    }
                    word = word.replace(/[^a-zA-Z0-9]/g, "");
                    var exists = false;
                    rows.forEach(row => {
                        if (row.Word === word) {
                            messageDB.run(/*sql*/`UPDATE Messages SET Count = Count + 1 WHERE rowid=?`, [row.id]);
                            exists = true;
                        }
                    });
                    if (!exists) {
                        messageDB.run(/*sql*/`INSERT INTO Messages (Word, Count) VALUES (?, ?)`, [word, 1]);
                    }
                }
            });
        }
    });
    //#endregion
});

client.on("message", async (message) => {
    //* sets last activity on message
    //#region
    var exists = false;
    let sql = /*sql*/`SELECT    DateTime,
                                UserId,
                                _rowid_ id
                        FROM Activity
                        ORDER BY _rowid_`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return;
        }
        if (!message.author.bot) {
            rows.forEach(function (row) {
                if (row.UserId === message.author.id) {
                    db.run(/*sql*/`UPDATE Activity SET DateTime = ? WHERE rowid=?`, [message.createdTimestamp, row.id - 1]);
                    exists = true;
                }
            });
            if (!exists) {
                db.run(/*sql*/`INSERT INTO Activity (UserId, DateTime) VALUES (?, ?)`, [message.author.id, message.createdTimestamp]);
            }
        }
    });
    //#endregion

    //* checks if game clip is an actual clip
    //#region
    if (message.channel == config.clipchannel) {
        if (!(message.content.includes("https://") || message.content.includes("http://") || message.attachments.array().length != 0)) {
            message.delete();
            message.author.send(`Please send only clips in <#${config.clipchannel}>`);
        }
    }
    //#endregion
});

// client.on("messageReactionAdd", async (messageReaction) => {
//     //* Invite
//#region
    //#region
//#region
//     if (messageReaction.partial) {
//         try {
//             await messageReaction.fetch().then(async function () {
//                 await messageReaction.message.fetch().then(async function () {
//                     if (messageReaction.emoji.name === "✅" && guild.id === messageReaction.message.guild.id && messageReaction.message.content.startsWith(".invite") && messageReaction.message.channel.id === config.invitechannel) {
//                         if (messageReaction.message.reactions.resolve("❌") != null) {
//                             if ((messageReaction.count - 1) - ((messageReaction.message.reactions.resolve("❌").count - 1) * 1.5) >= Math.ceil(hazeAmount * invitePercent)) {
//                                 if (messageReaction.message.createdTimestamp + 86400000 < Date.now()) {
//                                     messageReaction.message.channel.createInvite({ maxAge: 0, maxUses: 1, unique: true }).then(invite => {
//                                         messageReaction.message.author.send(invite.url);
//                                         messageReaction.message.author.send(messageReaction.message);
//                                     });
//                                     messageReaction.message.delete({ timeout: 1000 });
//                                     messageReaction.message.channel.send(`${messageReaction.message.content.slice(pLength + 6).trim()}'s invite has gone through`);
//                                 }
//                             }
//                         }
//                     }
//                 });
//             });
//         } catch (error) {
//             console.log("Something went wrong when fetching the reaction: ", error);
//         }
//     } else {
//         if (messageReaction.emoji.name === "✅" && guild.id === messageReaction.message.guild.id && messageReaction.message.content.startsWith(".invite") && messageReaction.message.channel.id === config.invitechannel) {
//             if (messageReaction.message.reactions.resolve("❌") != null) {
//                 if ((messageReaction.count - 1) - ((messageReaction.message.reactions.resolve("❌").count - 1) * 1.5) >= Math.ceil(hazeAmount * invitePercent)) {
//                     if (messageReaction.message.createdTimestamp + 86400000 < Date.now()) {
//                         messageReaction.message.channel.createInvite({ maxAge: 0, maxUses: 1, unique: true }).then(invite => {
//                             messageReaction.message.author.send(invite.url);
//                             messageReaction.message.author.send(messageReaction.message);
//                         });
//                         messageReaction.message.delete({ timeout: 1000 });
//                         messageReaction.message.channel.send(`${messageReaction.message.content.slice(pLength + 6).trim()}'s invite has gone through`);
//                     }
//                 }
//             }
//         }
//     }
//#endregion
// });

client.on("messageReactionAdd", async (messageReaction) => {
    //* Starboard
    //#region
    setTimeout(async function () { if (starActive) { starActive = false; } }, 10000);
    if (starActive) {
        while (starActive) {
            await sleep(500);
        }
    }
    starActive = true;

    if (messageReaction.partial) {
        await messageReaction.message.fetch();
    }

    if (messageReaction.emoji.name !== "⭐" || guild.id !== messageReaction.message.guild.id) {
        // Wrong emoji or wrong server, bail
        return;
    }

    db.all(/*sql*/`SELECT MessageId FROM "Starred" WHERE MessageId = ? LIMIT 1`, [messageReaction.message.id], async function (err, rows) {
        if (rows.length === 1) {
            // Message is already starboarded, don't starboard it again
            return;
        }

        if (messageReaction.count >= Math.ceil(activeUsers * starDevider) + 1) {
            var reactionMessage = await messageReaction.message.fetch();

            if (reactionMessage.reference && reactionMessage.reference.messageID) {
                /** @type { Discord.TextChannel } */
                var referencedChannel = await guild.channels.resolve(reactionMessage.reference.channelID).fetch();
                var referencedMessage = await referencedChannel.messages.resolve(reactionMessage.reference.messageID).fetch();
                var parsedMessage = `<@!${referencedMessage.author.id}>\n> ${referencedMessage.content.replace(/\n(?!$)/g, "\n> ")}`;
            }

            guild.channels.resolve(config.starboard).send(parsedMessage || "",{
                embed: await createRichEmbed(reactionMessage),
                allowedMentions: {
                    parse: []
                }
            });
            db.run(/*sql*/`INSERT INTO Starred VALUES (?)`, [messageReaction.message.id]);
            starActive = false;
        }
    });

    starActive = false;
    //#endregion
});

client.on("guildMemberRemove", async (guildMember) => {
    logChannel.send(`${guildMember.user.username} left the server`);
});

client.on("messageDelete", async (message) => {
    if (message.content === undefined) return;
    if (message.content.startsWith(".")) { return; }
    if (!message.author.bot) {
        if (message.attachments.array().length !== 0) {
            deletedChannel.send(`Channel: ${message.channel.name}\n Author: ${message.author.username}\n${message}\n**Contains Image**`, { disableMentions: "all" });
        } else {
            deletedChannel.send(`Channel: ${message.channel.name}\n Author: ${message.author.username}\n${message}`, { disableMentions: "all" });
        }
    }
});

client.on("voiceStateUpdate", (oldState, newState) => {
    //* channel ping roles
    //#region
    if (oldState.channel != undefined) {
        if (oldState.channel.parentID === config.vccategory) {
            config.voiceroles.forEach(array => {
                if (array[0] == oldState.channelID) {
                    oldState.member.roles.remove(array[1]);
                }
            });
        }
    }
    if (newState.channel != undefined) {
        if (newState.channel.parentID === config.vccategory) {
            config.voiceroles.forEach(array => {
                if (array[0] == newState.channelID) {
                    newState.member.roles.add(array[1]);
                }
            });
        }
    }
    //#endregion
});


//! Functions
//* sleep/timeout function
async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

//* check if someone is supposed to have the campaign role
async function campaignRole(/** @type {Discord.GuildMember} */user, deleteR = false) {
    let sql = /*sql*/ `SELECT   UserId,
                                _rowid_ id
                        FROM Campaign
                        ORDER BY _rowid_`;

    return new Promise((bool = false) => {
        setTimeout(() => {
            db.all(sql, [], (err, rows) => {
                if (err) {
                    bool(false);
                    return;
                }
                else {
                    for (var i = 0, len = rows.length + 1; i < len; i++) {
                        if (i === rows.length) {
                            bool(false);
                            return;
                        } else
                            if (user.id == rows[i].UserId) {
                                if (deleteR) {
                                    db.run(/*sql*/`DELETE FROM Campaign WHERE rowid=?`, i + 1);
                                    user.roles.remove(config.campaignrole);
                                }
                                bool(true);
                                return;

                            }
                    }
                    bool(false);
                    return;
                };

            });
        }, 500, false);
    });
}


//* check if there are reminders to be send
async function remindCheck() {
    var currDateTime = Date.now();
    let sql = /*sql*/ `SELECT   DateTime,
                                UserId,
                                Reminder,
                                _rowid_ id
                        FROM Reminders
                        ORDER BY DateTime`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        } else
            if (rows.length !== 0) {
                rows.forEach((row) => {
                    if (currDateTime >= row.DateTime) {
                        guild.channels.resolve(config.defaultchannel).send("<@" + row.UserId + ">, **you asked me to remind you:** " + row.Reminder, { disableEveryone: true });
                        db.run(/*sql*/`DELETE FROM Reminders WHERE rowid=?`, row.id, function (err) {
                            if (err) {
                                return console.error(err.message);
                            }
                        });
                    }
                });
            }
    });
}

//* check for invites that existed too long
async function inviteCheck() {
    guild.fetchInvites().then(invites =>
        invites.forEach(function (invite) {
            if (invite.createdTimestamp + 345600000 < Date.now()) {
                invite.delete();
            }
        })
    );
};

//* check for amount of users that are active
async function activeUserCheck() {
    var prevDateTime = Date.now() - activeTime;
    var localActiveUsers = 1;
    let sql = /*sql*/`SELECT    DateTime,
                                UserId
                        FROM Activity
                        ORDER BY _rowid_`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return;
        }
        rows.forEach(function (row) {
            if (row.DateTime >= prevDateTime) {
                localActiveUsers++;
            }
        });
        activeUsers = localActiveUsers;
        guild.channels.resolve(config.starboard).edit({ topic: `${Math.ceil(activeUsers * starDevider) + 1} stars needed for starboard` });
        guild.channels.resolve(config.logchannel).edit({ topic: `There are ${activeUsers} users active!` });
    });
}

// //* invite info channel description
// async function invitePercentageInfo() {
//     guild.roles.fetch(config.defaultrole).then(role => { hazeAmount = role.members.array().length; }).then(() => {
//         guild.channels.resolve(config.invitechannel).edit({ topic: `${Math.ceil(hazeAmount * invitePercent)} votes + ❌ modifier needed for success` });
//     });
// }

//* status set
async function setStatus(type, message, startup = false) {
    var promiseOutput = new Promise((output) => {
        setTimeout(() => {
            if (!startup) {
                if (type === undefined || type === null || message === undefined || message === null) {
                    type = "LISTENING";
                    message = "Discord";
                }
                var exists = false;
                let sql = /*sql*/`SELECT    Type,
                                            Message,
                                            _rowid_ id
                                    FROM Status
                                    ORDER BY _rowid_`;
                db.all(sql, [], (err, rows) => {
                    if (err) {
                        return;
                    }
                    rows.forEach(function (row) {
                        if (row.id === 1) {
                            db.run(/*sql*/`UPDATE Status SET Type = ?, Message = ? WHERE rowid=1`, [type, message]);
                            exists = true;
                            output(true);
                        }
                    });
                    if (!exists) {
                        db.run(/*sql*/`INSERT INTO Status (Type, Message) VALUES (?, ?)`, [type, message]);
                        output(true);
                    }
                });
            } else {
                let sql = /*sql*/`SELECT    Type,
                                            Message
                                    FROM Status
                                    ORDER BY _rowid_`;
                db.all(sql, [], (err, rows) => {
                    if (rows.length === 0) {
                        db.run(/*sql*/`INSERT INTO Status (Type, Message) VALUES (?, ?)`, ["LISTENING", "Discord"]);
                    }
                    output(false);
                });
            }
        }, 500, false);
    });
    await promiseOutput.then(function () {
        let sql = /*sql*/`SELECT    Type,
                                    Message
                            FROM Status
                            WHERE rowid = 1`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                return;
            }
            client.user.setActivity(rows[0].Message, { type: rows[0].Type });
        });
    });
}

//* init birthday sheet
async function sheetSetup() {
    doc.useApiKey(config.spreadsheetapikey)
        .then(async function () {
            doc.loadInfo()
                .then(async function () {
                    bdaySheet = doc.sheetsByIndex[0];
                    daysSince1970Sheet = doc.sheetsByIndex[1];
                    var now = new Date();
                    var timeout = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0) - now;
                    if (timeout < 0) {
                        timeout += 86400000;
                    }
                    setTimeout(function () {
                        checkBirthday();
                        setInterval(checkBirthday, 86400000);
                    }, timeout);
                });
        });
}

//* check for birthdays
async function checkBirthday() {
    var rows = await bdaySheet.getRows();
    var birthdayTimestamp = await daysSince1970Sheet.getRows();
    var curTime = new Date(Date.now());
    var curDay = curTime.getDate();
    var curMonth = curTime.getMonth();
    var birthdays = [];
    rows.forEach(function (row, id) {
        var day = birthdayTimestamp[id].day;
        var month = birthdayTimestamp[id].month;
        if (month == curMonth + 1 && day == curDay) {
            birthdays.push({ name: row.name, age: row.age });
        }
    });
    if (birthdays != []) {
        birthdays.forEach(data => {
            guild.channels.resolve(config.announcements).send(sample(quotes.birthdayQuotes).split("{name}").join(data.name).replace("{age}", data.age) + `\n<@&${config.birthdayrole}>`);
        });
    }
}
//? End of functions




//! database cleaning
async function dbVacuum() {
    db.run(/*sql*/`VACUUM "main"`);
}
dbVacuum;
setInterval(dbVacuum, 86400000);




process.on('unhandledRejection', err => {
    console.error(err);
    if (logChannel != undefined) {
        logChannel.send(`**ERROR**\n\`\`\`${err}\`\`\``);
    }
});



//! Intervals
setInterval(inviteCheck, 3600000);
// setInterval(invitePercentageInfo, 3600000);
setInterval(remindCheck, 60000);
setInterval(activeUserCheck, 600000);
sheetSetup();
