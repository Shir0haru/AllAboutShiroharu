import {InteractionResponseType, InteractionType, verifyKey } from "https://esm.sh/discord-interactions@3.4.0";

const INFO_COMMAND = {
    name: "Info",
    description: "Get an information about this bot.",
};
const HELP_COMMAND = {
    name: "Help",
    description: "Get a list of commands available.",
};
const PROFILE_COMMAND = {
    name: "profile",
    description: "Fetch the Developer's Game Profile.",
    options: [{
        name: "game",
        description: "Game platform",
        type: 3,
        required: true,
        choices: [{
                name: "Roblox",
                value: "roblox"
            },
            {
                name: "Minecraft",
                value: "minecraft"
            },
        ],
    }, ],
};

export default async (request, context) => {
    if (request.method !== "POST") {
        return new Response("Method not allowed", {
            status: 405
        });
    }

    try {
        const signature = request.headers.get("x-signature-ed25519");
        const timestamp = request.headers.get("x-signature-timestamp");
        const rawBody = await request.text();
        const isValidRequest = verifyKey(rawBody, signature, timestamp, Deno.env.get("PUBLIC_KEY"),);

        if (!isValidRequest) {
            console.error("Invalid Request");
            return new Response(
                JSON.stringify({
                    error: "Bad request signature"
                }), {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json"
                    },
                }
            );
        }

        async function fetchRobloxProfile(username) {
            console.log("Fetching profile for:", username);

            const idRes = await fetch("https://users.roblox.com/v1/usernames/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usernames: [username],
                    excludeBannedUsers: false,
                }),
            });

            const idJson = await idRes.json();
            console.log("ID Response:", idJson);

            const user = idJson.data ?.[0];
            if (!user) throw new Error("Roblox user not found");

            const userId = user.id;
            console.log("User ID:", userId);

            const profileRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
            const profile = await profileRes.json();
            console.log("Profile:", profile);

            const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=true`);
            const avatarJson = await avatarRes.json();
            const avatarUrl = avatarJson.data ?.[0]?.imageUrl;
            console.log("Avatar URL:", avatarUrl);

            const wearingRes = await fetch(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`);
            const wearingJson = await wearingRes.json();
            console.log("Wearing Response:", wearingJson);
            console.log("Asset IDs:", wearingJson.assetIds);

            const assetIds = wearingJson.assetIds || [];
            let assets = [];

            if (assetIds.length > 0) {
                console.log("Fetching asset details for", assetIds.length, "assets");
                const chunkSize = 10;
                const chunks = [];
                for (let i = 0; i < assetIds.length; i += chunkSize) {
                    chunks.push(assetIds.slice(i, i + chunkSize));
                }

                let assets = [];
                for (const chunk of chunks) {
                    const chunkPromises = chunk.map(async (assetId) => {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 200));
                            const res = await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`);
                            if (!res.ok) return null;
                            const data = await res.json();
                            return {
                                id: data.AssetId,
                                name: data.Name,
                                assetType: data.AssetTypeId,
                                creatorName: data.Creator ?.Name || "Unknown",
                            };
                        } catch (err) {
                            console.error(`Failed to fetch asset ${assetId}:`, err);
                            return null;
                        }
                    });

                    const chunkResults = await Promise.all(chunkPromises);
                    assets.push(...chunkResults.filter(a => a !== null));
                } console.log("Assets fetched:", assets.length);
            } else {
                console.log("No asset IDs found - user may not be wearing anything");
            } return {userId, profile, avatarUrl, assets};
        }

		function groupAvatarAssets(assets) {
    		const items = [];    
    		for (const item of assets) {
        		items.push(`${item.name} - by ${item.creatorName}`);
    		} return items;
		}

        function countryCodeToFlagEmoji(code) {
            if (!code || code.length !== 2) return "🌍";
            const upper = code.toUpperCase();
            const A = 0x1F1E6;
            return String.fromCodePoint(
                A + upper.charCodeAt(0) - 65,
                A + upper.charCodeAt(1) - 65
            );
        }

        async function fetchMinecraftProfile(username) {
            const playerRes = await fetch(
                `https://api.crafty.gg/api/v2/players/${username}`
            );

            if (!playerRes.ok) {
                throw new Error("Minecraft player not found");
            }
            const playerJson = await playerRes.json();
            const data = playerJson.data;
            return {
                uuid: data.uuid,
                name: data.username,
                profile: `https://crafty.gg/@${data.username}`,
                skinUrl: `https://minotar.net/helm/${data.uuid}/512.png`,
                previewSkin: `https://crafty.gg/skins/${data.skins[0].id}`,
                previewCape: `https://crafty.gg/capes/${data.capes[0].id}`,
                userLocation: data.location ? `${countryCodeToFlagEmoji(data.location.code)} ${data.location.country}` : "🌍 Unknown",
                monthlyViews: data.views_monthly,
                lifetimeViews: data.views_lifetime,
                downloadSkin: `https://minecraft.tools/download-skin/${data.username}`,
            };
        }

        const message = JSON.parse(rawBody);
        if (message.type === InteractionType.PING) {
            console.log("Handling Ping request");
            return new Response(
                JSON.stringify({
                    type: InteractionResponseType.PONG,
                }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json"
                    },
                }
            );
        } else if (message.type === InteractionType.APPLICATION_COMMAND) {
            switch (message.data.name.toLowerCase()) {

                case HELP_COMMAND.name.toLowerCase():
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: "Available commands: /help, /info, /profile roblox"
                        },
                    }), {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });

                case INFO_COMMAND.name.toLowerCase():
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            embeds: [{
                                title: "About This Bot",
                                description: "Hosted on Netlify Edge Functions",
                                color: 0x5865F2,
                            }],
                        },
                    }), {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });

                case PROFILE_COMMAND.name.toLowerCase(): {
                        const game = message.data.options ?.[0]?.value;
                        try {
                            if (game === "roblox") {
                                const USERNAME = "Shir0haru";
                                const {userId, profile, avatarUrl, assets} = await fetchRobloxProfile(USERNAME);
                                const avatarItems = groupAvatarAssets(assets);
                                return new Response(JSON.stringify({
                                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                    data: {
                                        embeds: [{
                                            title: `Roblox Profile for @${profile.name}`,
                                            url: `https://www.roblox.com/users/${userId}/profile`,
                                            description: profile.description || "No description",
                                            thumbnail: {
                                                url: avatarUrl
                                            },
                                            color: 0x00A2FF,
                                            fields: [{
                                                    name: "User ID",
                                                    value: String(userId),
                                                },
                                                {
                                                    name: "Created",
                                                    value: profile.created,
                                                },
                                                {
                                                    name: "User's Wearing",
                                                    value: avatarItems.length ? avatarItems.join("\n") : "Not wearing anything",
                                                    inline: false,
                                                },
                                            ],
                                        }],
                                        components: [{
                                            type: 1,
                                            components: [{
                                                type: 2,
                                                style: 5,
                                                label: "Complete Profile",
                                                url: `https://www.roblox.com/users/${userId}/profile`,
                                            }, ],
                                        }],
                                    },
                                }), {
                                    status: 200,
                                    headers: {
                                        "Content-Type": "application/json"
                                    }
                                });
                            }

                        if (game === "minecraft") {
                            const USERNAME = "Shir0haru";
                            const mc = await fetchMinecraftProfile(USERNAME);

                            return new Response(JSON.stringify({
                                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: {
                                    embeds: [{
                                        title: `Minecraft Profile for ${mc.name}`,
                                        url: `https://crafty.gg/player/${mc.uuid}`,
                                        color: 0x3BA55D,
                                        thumbnail: {
                                            url: mc.skinUrl,
                                        },
                                        fields: [{
                                                name: "UUID",
                                                value: `\`\`${mc.uuid}\`\``,
                                            },
                                            {
                                                name: "Textures",
                                                value: [
                                                    mc.previewSkin ?
                                                    `Skins: [View Current Skin](${mc.previewSkin})` :
                                                    "Skins: None",
                                                    mc.previewCape ?
                                                    `Capes: [View Current Cape](${mc.previewCape})` :
                                                    "Capes: None",
                                                ].join("\n"),
                                                inline: true,
                                            },
                                            {
                                                name: "Information",
                                                value: `Location: ${mc.userLocation}\n` +
                                                    `Monthly Views: ${mc.monthlyViews}\n` +
                                                    `Lifetime Views: ${mc.lifetimeViews}`,
                                            },
                                        ],
                                    }],
                                    components: [{
                                        type: 1,
                                        components: [
                                            {
                                                type: 2,
                                                style: 5,
                                                label: "Complete Profile",
                                                url: mc.profile,
                                            },
                                            {
                                                type: 2,
                                                style: 5,
                                                label: "Download Skin",
                                                url: mc.downloadSkin,
                                            }
                                        ]
                                    }],
                                },
                            }), {
                                status: 200,
                                headers: {
                                    "Content-Type": "application/json"
                                },
                            });
                        }

                        return new Response(JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "Game not supported."
                            },
                        }), {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });

                    } catch (err) {
                        console.error(err);
                        return new Response(JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: "Failed to fetch profile data."
                            },
                        }), {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });
                    }
                }
                default:
                    return new Response(JSON.stringify({
                        error: "Unknown Command",
                    }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
            }
        } else {
            console.error("Unknown Interaction Type");
            return new Response(
                JSON.stringify({
                    error: "Unknown Type"
                }), {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    },
                }
            );
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error"
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                },
            }
        );
    }
};
