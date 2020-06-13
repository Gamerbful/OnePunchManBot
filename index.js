const Discord = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');

const client = new Discord.Client();
const prefix = '!';

//Paramètres
const levels = ['3', '21', '36', '51', '66', '81', '96', '111', '121', '141', '156', '171', '186', '200', '201'];
const pingLevels = ['718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206', '718880562756059206'];
const token = "NzE4MDQ2ODQwMzUxNzUyMjIy.XtomRw.qxEcogAww-21mYU3CL2BWBbGxDw";
const number = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
const sortieMax = 5;
const id_numbers=["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
var id_sortie= "00000";

//données WAKFU json
const items = JSON.parse(fs.readFileSync("Wakfu_json/items.json"));
const actions = JSON.parse(fs.readFileSync("Wakfu_json/actions.json"));

cron.schedule('*/15 * * * * *', () => {
    client.guilds.cache.each(guild => {
        fichierSortie = guild.name.split(" ").join("_") + "/sortie.json";

        sorties = getSorties(fichierSortie);
        sortiesRestante = [];

        for (var i = 0; i < sorties.length; i++) {
            sortie = sorties[i];

            dateMaintenant = new Date();
            dateSortie = new Date(sortie.annee, sortie.mois - 1, sortie.jour, sortie.heure, sortie.minutes);
            minutesRestantes = diff_minutes(dateSortie, dateMaintenant);

            if (minutesRestantes <= 10) {
                if (minutesRestantes > 0) {

                    //Pas de problème, la sortie est notifiée
                    for (var j = 0; j < sortie.participants.length; j++) {
                        client.users.fetch(sortie.participants[j]).then(participant => {
                            participant.createDM().then(dmchannel => {
                                dmchannel.send("Ta sortie **" + sortie.description + "** est prévue dans **" + minutesRestantes + " minutes** !");
                            });
                        });
                    }

                    channelSortie = guild.channels.cache.get(fs.readFileSync(guild.name.split(" ").join("_")+"/id.txt",'utf-8'));
                    channelSortie.messages.fetch(sortie.message).then(message => {
                        message.delete();
                    }).catch((error) => {
                        console.error(error);
                    });
                }
            } else {
                //Sortie pas notifiée, on la remet dans le fichier
                sortiesRestante.push(sortie);
            }
        }

        setSorties(fichierSortie, sortiesRestante);
    });
});

client.on('guildCreate', (guild) => {
  fs.mkdir(guild.name.split(" ").join("_"), function(err) {
      if (err) {
          console.log(err)
      }
});

guild.channels.create("Sorties",{ reason: 'Channel des sorties' }).then( (channel) => {
    fs.writeFileSync(guild.name.split(" ").join("_")+"/id.txt", channel.id, 'utf-8');
});

});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
    sorties = getAllSorties();
    client.guilds.cache.forEach( (guild) => {
        channelSortie = guild.channels.cache.get(fs.readFileSync(guild.name.split(" ").join("_")+"/id.txt",'utf-8'));
        for (var i = 0; i < sorties.length; i++) {
            sortie = sorties[i];
            console.log("Tentative mise en cache du message " + sortie.message);
            channelSortie.messages.fetch(sortie.message).catch((error) => {
                //console.error(error);
            });
        }
    });
});

client.on('messageReactionAdd', (messageReaction, user) => {
    const message = messageReaction.message;
    sorties = getSorties(messageReaction.message.guild.name.split(" ").join("_")+"/sortie.json");
    indexSortie = messageSortieExiste(sorties, message.id);
    if (indexSortie === false) {
        return false;
    }

    sortie = sorties[indexSortie];

    if (['✅'].includes(messageReaction.emoji.name) && message.author.id !== user.id) {
        if (!sortie.participants.includes(user.id)) {
            sortie.participants.push(user.id);
            user.createDM().then(dmchannel => {
                dmchannel.send("Votre participation à la sortie **" + sortie.description + "** à été ajoutée !\n" +
                "\n" +
                "Pour rappel, voici les informations de la sortie :\n" +
                "\n" +
                "Niveau requis : " + sortie.niveau + "\n" +
                `${sortie.jour}/${sortie.mois}/${sortie.annee} - ${sortie.heure}:${sortie.minutes}\n` +
                "\n" +
                "Amusez-vous bien 😄");
            });
            setSorties(messageReaction.message.guild.name.split(" ").join("_")+"/sortie.json", sorties);
        }
    }
});

client.on('messageReactionRemove', (messageReaction, user) => {
    const message = messageReaction.message;
    sorties = getSorties(messageReaction.message.guild.name.split(" ").join("_")+"/sortie.json");
    if (indexSortie === false) {
        return false;
    }

    sortie = sorties[indexSortie];

    if (['✅'].includes(messageReaction.emoji.name) && message.author.id !== user.id) {
        if (sortie.participants.includes(user.id)) {
            indexUtilisateur = sortie.participants.indexOf(user.id);
            if (indexUtilisateur != -1) {
                sortie.participants.splice(indexUtilisateur, 1);
                user.createDM().then(dmchannel => {
                    dmchannel.send("Vous retirer votre participation à **" + sortie.description + "** !");
                });
                setSorties(messageReaction.message.guild.name.split(" ").join("_")+"/sortie.json", sorties);
            }
        }
    }
});

client.on('message', msg => {
  if (msg.content === prefix + 'ping') {
    msg.channel.send('This is an embed', {
        embed: {
          thumbnail: {
               url: 'attachment://file.png'
            }
         },
         files: [{
            attachment: 'file.png',
            name: 'file.png'
         }]
      })
  }
  else if (msg.content === 'stop') {
      console.log(client.user.id);
      client.destroy();
  }
  else if (msg.content.startsWith(prefix + 'sorties')) {
    message = "Voici tes prochaines sortie : \n";
    sorties = getSorties(msg.guild.name.split(" ").join("_")+"/sortie.json");
    nbSorties = 0;

    for (var i = 0; i < sorties.length; i++) {
        sortie = sorties[i];
        if (sortie.participants.includes(msg.author.id)) {
            message += `- **${sortie.description}**\n`;
            message += `\tNiveau requis : ${sortie.niveau}\n`;
            message += `\tDate : ${sortie.jour}/${sortie.mois}/${sortie.annee} - ${sortie.heure}:${sortie.minutes}\n`;
            nbSorties++;
        }
    }

    if (nbSorties == 0) {
        message += "- Aucune sortie prévue\n" +
        "\n" +
        "Commencer à créer des sorties avec /sortie [niveau] [jour-mois-année] [heure:date] [description] !";
    }

    msg.reply(message);
  }
  else if (msg.content.startsWith(prefix + 'sortie')) {
        id_sortie=last_id(msg.guild);
        content = msg.content.replace(/\[|\]/gm, "");
        nouvelleSortie = new Object();
        const args = content.slice(prefix.length).split(' ');
        const command = args.shift().toLowerCase();

        if (args.length < 4) {
            msg.channel.send("Vous n'avez pas entrer tout les paramètres.");
            return false;
        }

        objetSortieUtilisateur = getSortiesUtilisateur(msg.author.id,msg.guild);
        if (objetSortieUtilisateur.length >= sortieMax) {
            msg.channel.send("Vous avez atteint la limite de création de sortie !");
            return false;
        }

        nouvelleSortie.demandeur = msg.author.id;
        nouvelleSortie.niveau = args[0];
        date = args[1].replace(/\//gm, "-").split('-');
        heures = args[2].replace(/h/gm, ":").split(':');
        dateSortie = new Date(date[2], date[1] - 1, date[0], heures[0], heures[1]); //Car index du mois entre 0 et 11

        if (isNaN(dateSortie) || dateSortie == null || diff_minutes(dateSortie, new Date()) <= 0) {
            msg.channel.send("La date est invalide !");
            return false;
        }

        nouvelleSortie.jour = dateSortie.getDate();
        nouvelleSortie.mois = dateSortie.getMonth() + 1; //Car index du mois entre 0 et 11
        nouvelleSortie.annee = dateSortie.getFullYear();
        nouvelleSortie.heure = dateSortie.getHours();
        nouvelleSortie.minutes = dateSortie.getMinutes();
        nouvelleSortie.participants = [];
        nouvelleSortie.id=new_id();

        nouvelleSortie.description = "";
        for (var i = 3; i < args.length; i++) {
            nouvelleSortie.description += args[i] + " ";
        }

        //Vérification du niveau
        if (!levels.includes(nouvelleSortie.niveau)) {
            msg.channel.send("Impossible de trouver une tranche de donjon pour ce niveau !");
            return false;
        }

        indexPingLevel = levels.indexOf(nouvelleSortie.niveau);
        msg.guild.roles.fetch(pingLevels[indexPingLevel]).then(role => {
            client.users.fetch(nouvelleSortie.demandeur).then(sender => {
                const embed = new Discord.MessageEmbed();
                embed.setColor(0xff0000);
                embed.setTitle('Nouvelle sortie de guilde !');
                embed.setDescription(nouvelleSortie.description + "\nCliquer sur ✅ pour participer !");
                embed.addField("Id Sortie : ", id_sortie);
                embed.addField("Niveau requis :", nouvelleSortie.niveau, true);
                embed.addField("Demandeur :", sender.username, true);
                embed.addField("Date :", nouvelleSortie.jour + "/" + nouvelleSortie.mois + "/" + nouvelleSortie.annee + " à " + nouvelleSortie.heure + ":" + nouvelleSortie.minutes, false);
                embed.setAuthor(sender.username, sender.displayAvatarURL());

                msg.guild.channels.cache.get(fs.readFileSync(msg.guild.name.split(" ").join("_")+"/id.txt", 'utf-8')).send("<@&" + role + '> Voici la sortie prévue :', embed).then(message => {
                    nouvelleSortie.message = message.id;
                    message.react('✅');

                    try {
                        if (!fs.existsSync(msg.guild.name.split(" ").join("_") + "/")) {
                            fs.mkdir(msg.guild.name.split(" ").join("_"), function(err) {
                                if (err) {
                                    console.log(err)
                                }
                            });
                        }
                        sorties = getSorties(msg.guild.name.split(" ").join("_")+"/sortie.json");
                    } catch(err) {
                        console.error(err)
                    }

                    sorties.push(nouvelleSortie);
                    setSorties(msg.guild.name.split(" ").join("_")+"/sortie.json", sorties);
                });
            });
        });
    }

    else if(msg.content.startsWith(prefix + 'remove')){
        sorties = getSorties(msg.guild.name.split(" ").join("_")+"/sortie.json");
        sortiesUtilisateur = getSortiesUtilisateur(msg.author.id,msg.guild);

        send = "";

        if (sortiesUtilisateur.length == 0){
            msg.channel.send("Vous n'avez créé aucune sortie !");
        } else {
            index = 0;
            sortiesUtilisateur.forEach(function(sortie) {
                send = send + number[index] + " " + sortie.description + " - " + sortie.jour + "/" + sortie.mois + "/" + sortie.annee + " " + sortie.heure + ":" + sortie.minutes + "\n";
                index++;
            });
        }

        if(send != "") {
            msg.channel.send(send).then(async function (message){
                for(i=0; i<index; i++) {
                    message.react(number[i]);
                }

                const filter = (reaction, user) => {
                    return  user.id === msg.author.id;
                };

                await message.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
                    if (number.includes(reaction.emoji.name)) {
                        left_sortie = sortiesUtilisateur[number.indexOf(reaction.emoji.name)];
                        msg.reply("Sortie " + left_sortie.description + " annulée!");

                        participants = left_sortie.participants;

                        for(j = 0; j < participants.length; j++) {
                            client.users.fetch(participants[j]).then(participant => {
                                participant.createDM().then(dmchannel => {
                                    dmchannel.send("La sortie **" + left_sortie.description + "** est **" + "annulée** !");
                                });
                            });
                        }

                        sorties.splice(sorties.indexOf(left_sortie));
                        setSorties(msg.guild.name.split(" ").join("_")+"/sortie.json",sorties);
                        message.delete();
                    }
                }).catch(collected => {
                    message.delete();
                    msg.reply('Vous n\'avez rien sélectioner, la demande à été annulée !');
                });
            });
        }
    }
    else if(msg.content.startsWith(prefix + "participants")){
      const args = msg.content.slice(prefix.length).split(' ');
      sorties = getSorties(msg.guild.name.split(" ").join("_")+"/sortie.json");
      trouve=false;
      sorties.forEach( (sortie) =>  {
        if(sortie.id == args[1]){
            if(sortie.participants.length!=0) {
                participants = sortie.participants;

                var noms=[];
                nbErreur = 0;
                for(var i=0; i<participants.length; i++){
                    client.users.fetch(participants[i]).then((participant) =>{
                        noms.push("\t- "+participant.username);
                        if (noms.length == participants.length - nbErreur){
                            msg.reply(" Les Participants de la Sortie " + sortie.description + ":" + "\n" + noms.join("\n") );
                        }
                    }).catch((participant) => {
                        nbErreur++;
                        msg.reply(" Un des participants n'existe plus ou ne fait plus parti du serveur! ");
                    });

                }
            } else{
                msg.reply( " Il n' y a pas de participants actuellement pour la " + sortie.description );
            }
            trouve=true;
        }
      });
      if(!trouve){
        msg.reply(" Pas de sortie avec cette id ");
      }
    }

    else if(msg.content.startsWith( prefix + 'bonus' )){
      const rarity = [ "**Commun**" , "**Rare**" , "**Mythique**" , "**Légendaire**", "**Relique**", "**Souvenir**", "**Epique**" ]
      const args = msg.content.slice(6);
      trouve=false;
      var res = "";
      items.forEach( item => {
        try{
        if (item.title.fr.toLowerCase().split(" ").join("") == args.toLowerCase().split(" ").join("")){
          if(!trouve){
          res = res + item.title.fr + "\n";
          trouve=true;}
          res = res + rarity[item.definition.item.baseParameters.rarity-1] + "\n";
          item.definition.equipEffects.forEach( effect => {
            actions.forEach( action => {
            if (action.definition.id == effect.effect.definition.actionId ){
              res = res + replaceAll(action.description.fr,["[#1]","[#2]","[#3]","[#4]"],effect.effect.definition.params,item.definition.item.level) +"\n";
            }
          });
        });
        res = res + "\n";
      }}
      catch{
        console.log('pas de titre');
      }
    });
    if(trouve){
    msg.reply(res);
  }
  else{
    msg.reply(" Pas d'items ayant ce nom : "+ args);
  }
}

  else if( msg.content.startsWith( prefix + 'help' )){
    const args = msg.content.slice(6);
    const help = {
      "sortie": "```css\n !sortie \n Arguments : [lvl requis] [date : jj/mm/aaaa] [heure] [nom de la sortie] \n But : [Création d'une sortie] ```",
      "sorties": "```css\n!sorties : [affiche les sorties auxquelles vous participez]```",
      "participants": "```css\n!participants \n **Arguments** : [id de la sortie ( dispo dans le message de la sortie )] \n But : [Affiche les Participants de la Sortie avec l'id correspondant]```",
      "remove": "```css\n!remove \n Arguments : [id de la sortie ( dispo dans le message de la sortie )] \n But : [Détruit la Sortie avec l'id correspondant]```",
      "Unprediktable": "```css\n'Nous craignons ne pouvoir vous en dire d'avantage...'```",
      "bonus": "```css\n!bonus \n Arguments : [nom de l'item ( sans fautes )] \n But : [Donne les stats de l'item en question] ```",
      "help": "```css\n!help \n Arguments : [Facultatif : nom de la commande] \n But : [Donne les infos d'utilisation de la commande ou les commandes disponibles si aucun arguments] ```"
    };
    if( help[args]!=undefined ){
      msg.reply(help[args]);
    }
    else if( args == ""){
      var reply = "\n>>> Commandes Disponibles : \n";
      for( var key in help ){
        if ( key!= "Unprediktable" ) {
        reply = reply + "-\t"+key+"\n";
      }
      }
      msg.reply(reply);
    }
    else{
      msg.reply(" Pas de commande se nommant : " + args );
    }
  }
});
client.login(token);

function getSorties(path) {
    if (fs.existsSync(path)) {
        let rawDataSorties = fs.readFileSync(path);
        sorties = JSON.parse(rawDataSorties);
    } else {
        sorties = [];
    }

    return sorties;
}

function getAllSorties() {
      sorties=[];
      client.guilds.cache.each((guild) => {
        sorties.concat(getSorties(guild.name.split(" ").join("_")+"/sortie.json"));
     });
      return sorties;
}


function setSorties(path, sorties) {
    fs.writeFileSync(path, JSON.stringify(sorties), 'utf-8');
}

function getSortiesUtilisateur(userId,guild) {
    sorties = getSorties(guild.name.split(" ").join("_")+"/sortie.json");
    sortiesUtilisateur = [];

    for (var i = 0; i < sorties.length; i++) {
        sortie = sorties[i];
        if (sortie.demandeur == userId) {
            sortiesUtilisateur.push(sortie);
        }
    }

    return sortiesUtilisateur;
}

function messageSortieExiste(sorties, id) {
    for (var i = 0; i < sorties.length; i++) {
        if (sorties[i].message == id) return i;
    }

    return false;
}

function diff_minutes(dt1, dt2)
{
    var diff = (dt1.getTime() - dt2.getTime()) / 1000;
    diff /= 60;
    return Math.round(diff); //Math.abs() pour valeur absolue
}

function new_id()
{
  id=id_sortie.split("");
  var max_index=id.length-1;
  if (id[max_index] == "9"){
    id[max_index] = "0";
    index=max_index;
    while(id[index-1] == "9" && index>0 ){
      id[index-1] = "0";
      index = index-1;
    }
    if (index>0){
      id[index-1]=id_numbers[id_numbers.indexOf(id[index-1])+1];
    }
  }
    else{
      id[max_index] = id_numbers[id_numbers.indexOf(id[max_index])+ 1];
    }
 id_sortie=id.join("");
  return id_sortie;
}

function last_id(guild)
{
  sorties=getSorties(guild.name.split(" ").join("_")+"/sortie.json");
  if(sorties.length == 0){
    return "00000";
  }
  else{
  return sorties[sorties.length-1].id;
}
}

function replaceAll(string,outs,substitute,lvl){
  string = remove_things(string);
  pair=[0,1]
  for( var i=0; i<substitute.length; i++){
  if( i == 0 ){
  string = string.split(outs[i]).join(substitute[pair[1]]*lvl+substitute[pair[0]]);
  }
  else{
  string = string.split(outs[i]).join(substitute[i+1]);
}}
return string;}

function remove_things(string){
  const enlever = ['[~3]?[#1] Maîtrise [#3]:',  '[~3]?[#1] Mastery [#3]:',
    '[~3]?[#1] Résistance [#3]:',
    '[~3]?[#1] Resistance [#3]:',
    '[>1]?',
    '[>2]?s:',
    '{[>2]?:s}',
    '[=2]?:s',
    '[=2]?s:',
    '[=2]?:',
    '[~3]?',
    "{",
    "}",
    '[el1]',
    '[el2]',
    '[el3]',
    '[el4]' ];

    const element = [ "feu","eau","terre","air"];
    enlever.forEach( elt => {
      if ( elt.includes('[>2]') ){
        string = string.split(elt).join("s");
      }
      else if ( elt.includes('[el') ){
        string = string.split(elt).join(element[elt[3]-1])
      }
      else{
      string = string.split(elt).join("");}
    });
    return string;


}
