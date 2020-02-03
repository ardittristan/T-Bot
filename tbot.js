//! Imports
const sqlite3 = require("sqlite3");
const Discord = require("discord.js");
const GetNextDate = require("get-next-date");
const { existsSync, mkdirSync } = require("fs");
const { convertDelayStringToMS, createRichEmbed } = require("./libs/draglib");
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], disabledEvents: ['TYPING_START'] });
const config = require("./config.json");

//* Attachments
const hazeImg = new Discord.MessageAttachment("https://i.imgur.com/DzzIppd.png", "Haze.png");
const bulliImg = new Discord.MessageAttachment("https://cdn.discordapp.com/attachments/659472253913661458/665701475426631698/unknown.png", "StopBulli.png");
const eclairImg = new Discord.MessageAttachment("https://cdn.discordapp.com/attachments/656761226004791298/669289619258605578/eclair.png", "Eclair.png");




//test

//! Globar vars
const pLength = config.prefix.length;
var logChannel;
var guild;
var activeUsers = 1;
//* percentage of active needed for star + 1
var starDevider = 0.15;
//* amount of time passed without message to be considered inactive
var activeTime = 3600000;
var starActive = false;




//! Init database
var dir = "./db";
if (!existsSync(dir)) {
    mkdirSync(dir);
}
let db = new sqlite3.Database("./db/database.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("connected to Reminder db");
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





//! Startup code

client.login(config.token);

client.on("ready", () => {

    guild = client.guilds.get(config.guildid);
    logChannel = guild.channels.resolve(config.logchannel);

    inviteCheck();
    remindCheck();
    activeUserCheck();
    setStatus(undefined, undefined, true);
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
                ".disconnect\n -disconnects you from your current vc channel" +
                "```"
            ).then(message =>
                message.delete({ timeout: 30000 })
            );
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "rename":
            //* voice channel rename
            //#region
            if (message.channel.id === config.vctalk && message.member.voice.channel != undefined) {
                if (message.member.voice.channel.parentID === config.vccategory) {
                    message.member.voice.channel.setName(message.content.slice(pLength + 6).trim());
                    console.log("test");
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
                message.channel.createInvite({ maxAge: 0, maxUses: 1, unique: true }).then(invite =>
                    message.channel.send(invite.url).then(message =>
                        message.delete({ timeout: 30000 })
                    )
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
            guild.roles.get(config.botroleid).setName(message.content.slice(pLength + 7).trim());
            logChannel.send(`${authr}` + " set bot role name to: `" + message.content.slice(pLength + 7).trim() + "`");
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "addhaze":
            //* adds haze role
            //#region
            if (message.channel.id === config.adddefaultchannel && message.mentions.members.first()) {
                message.mentions.members.first().roles.add(config.defaultrole);
                client.channels.get(config.defaultchannel).send(message.mentions.members.first(), hazeImg);
            }
            else if (message.channel.id === config.adddefaultchannel) {
                //* if no input lists users without haze
                var output = "**Members without haze:**\n";
                var length = message.guild.members.array().length;
                var i = 0;
                message.guild.members.forEach(function (member) {
                    if (!member.roles.has(config.defaultrole) && !member.user.bot) {
                        output = output + `${member}` + " `" + member.id + "`\n";
                    }
                    i++;
                    if (i === length) {
                        client.channels.get(config.adddefaultchannel).send(output);
                    }
                });
            }
            break;
        //#endregion

        case "addgame":
            //* adds pingable game role
            //#region
            guild.roles.create({ data: { name: message.content.slice(pLength + 7).trim(), mentionable: true, position: guild.roles.find(r => r.id === config.defaultrole).rawPosition - 1 } });
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

        case "remind":
            //* reminder tool
            //#region
            var arg = message.content.slice(pLength + 6).trim();
            var delayString = arg.substr(0, arg.indexOf(" "));
            var delay = new Date(Date.now() + convertDelayStringToMS(delayString));
            if (delay) {
                var reminder = arg.substr(delayString.length).trim();
                var author = authr.id;
                db.run(/*sql*/`INSERT INTO Reminders VALUES (?, ?, ?)`, [delay, author, reminder]);
                message.channel.send("You have set a reminder for: `" + delay.toISOString().replace(/T/, " ").replace(/\..+/, " GMT`"));
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
                guild.members.find(m => m.id === authr.id).voice.setChannel(null);
            }
            message.delete({ timeout: 1000 });
            break;
        //#endregion

        case "addcampaign":
            //* adds campaign role to someone
            //#region
            if (message.member.roles.has(config.gmrole) || authr.id == guild.ownerID) {
                db.run(/*sql*/`INSERT INTO Campaign VALUES (?)`, [message.mentions.members.first().id]);
                message.mentions.members.first().roles.add(config.campaignrole);
                message.channel.send("Gave user campaign role.");
            }
            break;
        //#endregion

        case "removecampaign":
            //* removes campaign role from someone
            //#region
            if (message.member.roles.has(config.gmrole) || authr.id == guild.ownerID) {
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
                }
                if (day === 7) { message.channel.send("Error"); return; }
                var date = new Date(Date.now());
                var ongoing = true;
                while (ongoing) {
                    date = GetNextDate(date);
                    if (date.getDay() === day) {
                        ongoing = false;
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
    }
});
//? End of commands




//! Other events

client.on("emojiCreate", async (emoji) => {
    guild.channels.resolve(config.defaultchannel).send("New emoji - " + emoji);
});

client.on("guildMemberUpdate", async (_old, member) => {
    //* checks if user gives themselve the campaign role when they're not allowed to
    if (member.roles.has(config.campaignrole)) {
        if (!await campaignRole(member)) {
            member.roles.remove(config.campaignrole);
        }
    };
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
});

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
        try {
            await messageReaction.fetch().then(async function () {
                await messageReaction.message.fetch().then(async function () {
                    if (messageReaction.emoji.name === "⭐" && guild.id === messageReaction.message.guild.id) {
                        var exists = false;
                        db.all(/*sql*/`SELECT MessageId FROM "Starred" WHERE MessageId = ? LIMIT 1`, [messageReaction.message.id], async function (err, rows) {
                            if (rows.length === 1) { exists = true; }
                            if (messageReaction.count >= Math.ceil(activeUsers * starDevider) + 1 && !exists) {
                                guild.channels.resolve(config.starboard).send(await createRichEmbed(await messageReaction.message));
                                db.run(/*sql*/`INSERT INTO Starred VALUES (?)`, [messageReaction.message.id]);
                                starActive = false;
                            }
                        });
                    }
                });
            });
        } catch (error) {
            console.log("Something went wrong when fetching the reaction: ", error);
            starActive = false;
        }
    } else {
        if (messageReaction.emoji.name === "⭐" && !messageReaction.message.system && guild.id === messageReaction.message.guild.id) {
            var exists = false;
            db.all(/*sql*/`SELECT MessageId FROM "Starred" WHERE MessageId = ? LIMIT 1`, [messageReaction.message.id], async function (err, rows) {
                if (rows.length === 1) { exists = true; }
                if (messageReaction.count >= Math.ceil(activeUsers * starDevider) + 1 && !exists) {
                    guild.channels.resolve(config.starboard).send(await createRichEmbed(await messageReaction.message));
                    db.run(/*sql*/`INSERT INTO Starred VALUES (?)`, [messageReaction.message.id]);
                    starActive = false;
                }
            });
        }
    }
    starActive = false;
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
async function campaignRole(user, deleteR = false) {
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
                        guild.channels.resolve(config.defaultchannel).send("<@" + row.UserId + ">, you asked me to remind you: ```" + row.Reminder + "```");
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
//? End of functions





//! Intervals
setInterval(inviteCheck, 3600000);
setInterval(remindCheck, 60000);
setInterval(activeUserCheck, 600000);