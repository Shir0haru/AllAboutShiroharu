import {InteractionResponseType, InteractionType, verifyKey} from "https://esm.sh/discord-interactions@3.4.0";

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

        const isValidRequest = verifyKey(
            rawBody,
            signature,
            timestamp,
            Deno.env.get("PUBLIC_KEY"),
        );

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
            const user = idJson.data ?.[0];
            if (!user) throw new Error("Roblox user not found");

            const userId = user.id;
            const profileRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
            const profile = await profileRes.json();
            const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=true`);
            const avatarJson = await avatarRes.json();
            const avatarUrl = avatarJson.data ?.[0]?.imageUrl;
            return {userId, profile, avatarUrl};
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
                nameHistory: data.username_history || [],
                hasCape: Boolean(data.capes ?.length),
                skinUrl: `https://api.crafty.gg/api/v2/skins/${username}/raw`,
                downloadSkin: `https://api.crafty.gg/api/v2/skins/${username}/raw`,
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
                    const game = message.data.options ?. [0] ?.value;
                    try {
                        if (game === "roblox") {
                            const USERNAME = "Shir0haru";
                            const {
                                userId,
                                profile,
                                avatarUrl
                            } =
                            await fetchRobloxProfile(USERNAME);

                            return new Response(JSON.stringify({
                                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: {
                                    embeds: [{
                                        title: `${profile.displayName} (@${profile.name})`,
                                        url: `https://www.roblox.com/users/${userId}/profile`,
                                        description: profile.description || "No description",
                                        thumbnail: {
                                            url: avatarUrl
                                        },
                                        color: 0x00A2FF,
                                        fields: [{
                                                name: "User ID",
                                                value: String(userId),
                                                inline: true
                                            },
                                            {
                                                name: "Created",
                                                value: profile.created,
                                                inline: true
                                            },
                                            {
                                                name: "Banned",
                                                value: profile.isBanned ? "Yes" : "No",
                                                inline: true
                                            },
                                        ],
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
                                        title: `${mc.name} (Minecraft)`,
                                        url: `https://namemc.com/profile/${mc.uuid}`,
                                        color: 0x3BA55D,
                                        thumbnail: {
                                            url: mc.skinUrl
                                        },
                                        fields: [{
                                                name: "UUID",
                                                value: mc.uuid
                                            },
                                            {
                                                name: "Name History",
                                                value: mc.nameHistory
                                                    .map(n => n.name)
                                                    .slice(-5)
                                                    .join(" → "),
                                            },
                                            {
                                                name: "Cape",
                                                value: mc.capeUrl ? "Yes" : "No",
                                                inline: true,
                                            },
                                        ],
                                    }],
                                    components: [{
                                        type: 1,
                                        components: [{
                                            type: 2,
                                            style: 5,
                                            label: "Download Skin",
                                            url: mc.downloadSkin,
                                        }, ],
                                    }, ],
                                },
                            }), {
                                status: 200,
                                headers: {
                                    "Content-Type": "application/json"
                                }
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
                } default:
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
