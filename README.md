
# Discord-Netlify

Discord's HTTP Slash Commands hosted on [Netlify](https://www.netlify.com/). It is a fork from [IanMitchell/discord-trout](https://github.com/IanMitchell/discord-trout). Project is Licensed using MIT License, as the original Repository. This Repository is NOT Affiliated by the original Repository.

## How to Deploy

Here is the steps of deploying your Discord Bot using Netlify.

1. Fork this Repository.
2. Make sure to already connect your Netlify account to your GitHub account.
3. Create a new Application/Bot through [Discord Developer Portal](https://discord.com/developers/applications). Copy the Bot Token, Application ID, and Public Key to a safe place, or just make an ``.env`` file out of it. Because we gotta export that into Netlify. Example of the file is shown below:
```env
APPLICATION_ID="1099635421681549395"
PUBLIC_KEY="c592be0c2db772eb013ccd0586bb271e4322621b7934b9b5153a5b48d822cf65"
TOKEN="MTAxMjM0NTY3ODkwMTIzNDU2.LmNoPQ.FakeTokenForDisplayOnly1234567890"
```
4. You can modify it at ``netlify/edge-functions/index.js`` for adding more commands for your bot. Add these lines for each commands:
- Register Command
```
const NAMECOMMAND_COMMAND = {
	name: "NameCommand",
	description: "Command Description Here"
};
```
Say you want to register ``/info`` command, you can add these:
```
const INFO_COMMAND = {
	name: "Info",
	description: "Get an Information about this bot."
};
```
- Define How Command Works
```
case NAMECOMMAND_COMMAND.name.toLowerCase():
	console.log("Command Request");
	return new Response(
		JSON.stringify({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
			content: "Bot will chat this exact word.",
			},
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		}
	);
```
Say you want to define ``/info`` command, you can add these:
```
case INFO_COMMAND.name.toLowerCase():
	console.log("Info Request");
	return new Response(
		JSON.stringify({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: "This Bot is Hosted through Netlify's Serverless Function!",
			},
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		}
	);
```
You don't like Plain Message? You want an Embed Message? I got'chu:
```
case INFO_COMMAND.name.toLowerCase():
	console.log("Info request");
	return new Response(
		JSON.stringify({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				embeds: [{
					title: "About This Bot",
					description: "This Bot is Hosted through Netlify's Serverless Function!",
					color: 0x5865F2,
					fields: [{
						name: "This is Embed",
						value: "You can add Some value",
					},
					{
						name: "But only static",
						value: "You need to commit to your repository in order to edit this",
						inline: true,
					},],
				},],
			},
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		}
	);
```
5. After the modifications fits your needs, now head to Netlify. Choose ``Add New Project`` and then ``Import an Existing Project``.
6. Choose GitHub as the provider. If not yet connected, you can setup as well right there.
7. After connected, choose the repository that you've been forked.
8. Insert the Environment Variables by Importing your own Bot's ``.env``
9. Deploy your Project. Wait for it to finish Deploying. Then you'll get the Netlify Domains. E.g. ``generated-domain69420.netlify.app`` 
10. Head to the Discord Developer Portal AGAIN. Go to your Applications for this Bot.
11. Head to ``Interactions Endpoint URL`` and fill it with ``https://generated-domain69420.netlify.app/api/interactions``. Then Save.
12. Finally, Head to your Discord Server, and test some commands!
## Slash Commands is Not Registered?

Sometimes, the Slash Commands is not Registered Properly. Here is how to Register the Slash Commands, locally on your PC:
1. Install [Node.js](https://nodejs.org/en), and then Install Discord.js Module. We will use that for Registering the Slash Commands.
```bash
  npm i discord.js
```
2. Create a JS file for Registering the commands (e.g. ``register.js``). Here is the example of the file:
```
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const TOKEN = process.env.TOKEN;
const APPLICATION_ID = process.env.APPLICATION_ID;

const commands = [
	new SlashCommandBuilder().setName('help').setDescription('Get a list of commands available.'),
	new SlashCommandBuilder().setName('invite').setDescription('Get an invite link to add the bot to your server.'),
	new SlashCommandBuilder().setName('info').setDescription('Get an Information about this bot.'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
	try {
		console.log('Registering SLASH commands...');

		await rest.put(
			Routes.applicationCommands(APPLICATION_ID),
			{ body: commands }
		);

		console.log('Global commands registered.');
	} catch (error) {
		console.error(error);
	}
})();
```
3. In the same directory as the JS file you've created, run a command:
```
node register.js
```
