const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionsBitField,
    WebhookClient,
} = require("discord.js");
const {
    cargarFrutas,
    cargarUsuarios,
    getFrutas,
    getUsuarios,
    guardarFrutas,
    guardarUsuarios,
    guardarFrutasRst,
    guardarUsuariosRst,
} = require("./database.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageActionRow, MessageButton } = require("discord.js");
const { token } = process.env;
const prefix = "h! ";
const keep_alive = require("./keep_alive.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Este intent es clave
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers, // Solo si gestionas miembros
    ],
});

// Carga frutas y usuarios al inicio
cargarFrutas();
cargarUsuarios();

client.once("ready", () => {
    console.log(`Bot conectado como ${client.user.tag}!`);
});

// SPAWN FRUTAS
client.on("messageCreate", (message) => {
    // Ignorar mensajes de bots
    if (message.author.bot) return; // Esto ignora cualquier mensaje de bots

    spawnearFruta(message);
});

function spawnearFruta(message) {
    if (Math.random() < 0.005) {
        console.log(`Fruta Generada Aleatoriamente`);
        const frutasNoReclamadas = obtenerFrutasSinOwner();

        // Si existen frutas disponibles (sin dueño)
        if (frutasNoReclamadas.length > 0) {
            // Elegir una fruta aleatoria
            const fruta =
                frutasNoReclamadas[
                    Math.floor(Math.random() * frutasNoReclamadas.length)
                ];

            // Crear un embed para la fruta emergente
            const embed = new EmbedBuilder()
                .setColor("#1ddb4f") // Color del borde del embed
                .setTitle(`**La ${fruta.name}!**`) // Título del embed
                .setDescription(`Una Hanasu no Mi ha emergido...`) // Descripción
                .setImage(fruta.imagen); // URL de la imagen de la fruta

            // Enviar el embed al canal y guardar el mensaje en una variable
            message.channel.send({ embeds: [embed] }).then((frutaMensaje) => {
                console.log(`La ${fruta.name} ha aparecido`);

                // Manejar reacciones
                const filter = (reaction, user) => {
                    return !user.bot; // Filtrar solo reacciones de usuarios no bots
                };

                // No se agrega una reacción específica aquí

                const collector = frutaMensaje.createReactionCollector({
                    filter,
                    max: 1,
                    time: 360000,
                }); // Tiempo en milisegundos (60s)

                collector.on("collect", (reaction, user) => {
                    let usuarios = getUsuarios();
                    // Buscar si el usuario ya tiene una fruta
                    let usuarioExistente = usuarios.usuarios.find(
                        (u) => u.id === user.id,
                    );

                    if (!usuarioExistente) {
                        usuarioExistente = {
                            id: user.id,
                            nombre: null,
                            nombreRom: null,
                        }; // Inicializa fruta como null
                        usuarios.usuarios.push(usuarioExistente); // Agrega el nuevo usuario al array
                    }

                    // Verificar si el usuario ya tiene una fruta
                    if (usuarioExistente.nombre) {
                        // Si el usuario ya tiene una fruta, enviar un mensaje y expulsarlo
                        message.channel.send(
                            `${user.username} intentó reclamar dos frutas, por lo que ha sido expulsado.`,
                        );
                        eliminarFrutaDeUsuario(user.id);
                        message.guild.members
                            .kick(user.id)
                            .catch((err) =>
                                console.error(
                                    `No se pudo expulsar a ${user.username}:`,
                                    err,
                                ),
                            );
                        return;
                    }

                    console.log(
                        `${user.username} ha reclamado la fruta: ${fruta.name}`,
                    );
                    usuarioExistente.fruta = fruta.name; // Asigna la fruta al usuario
                    fruta.owner = user.id; // Asigna el dueño a la fruta

                    // Guarda en la base de datos
                    guardarFrutas(
                        fruta.name,
                        fruta.nameRom,
                        fruta.descripcion,
                        fruta.imagen,
                        user.id,
                    ); // Guarda la fruta en la base de datos
                    guardarUsuarios(user.id, fruta.name, fruta.nameRom); // Guarda el usuario en la base de datos

                    // Mensaje de confirmación al canal
                    message.channel.send(
                        `${user.username} ha reclamado la fruta: **La ${fruta.name}!**`,
                    );
                });

                collector.on("end", (collected) => {
                    if (collected.size === 0) {
                        message.channel.send(
                            "Nadie reclamó la fruta a tiempo.",
                        );
                    }
                });
            });
        }
    }
}

// SALIDA DE USUARIO
client.on("guildMemberRemove", (member) => {
    const userId = member.id;
    console.log(`${member.user.username} ha salido del servidor.`);

    eliminarFrutaDeUsuario(userId);
    // Elimina la fruta del usuario que se ha ido
});

// COMANDOS DE ADMIN
client.on("messageCreate", (message) => {
    if (message.member) {
        if (
            (message.member.permissions.has(
                PermissionsBitField.Flags.Administrator,
            ) &&
                message.content.toLowerCase() === prefix + "fruits") ||
            message.content.toLowerCase() === prefix + "full reset"
        ) {
            if (message.content.toLowerCase() === prefix + "fruits") {
                mostrarFrutas(message);
            }
            if (message.content.toLowerCase() === prefix + "full reset") {
                resetHanasu(message);
                message.channel.send(
                    "¡Todas las frutas han sido reiniciadas y todos los usuarios han sido eliminados!",
                );
            } else {
                message.channel.send("No eres administrador!");
            }
        }
    }
});

// COMANDO USUARIOS
client.on("messageCreate", (message) => {
    if (message.content.toLowerCase() === prefix + "users") {
        mostrarUsuarios(message);
    }
    if (message.content.toLowerCase() === prefix + "help") {
        message.channel.send(
            `# Hanasu no Mis: Las frutas del habla\nEste bot """simula""" (sin presupuesto y con bugs explotables) la experiencia de las famosas Akuma no Mis (Frutas del diablo) de One Piece:\n- Las frutas (llamadas "Hanasu no Mis" {Frutas del Habla}) aparecerán aleatoriamente cada que se mande un mensaje.\n- Cuando una aparezca, se tiene un limite de tiempo para reclamarla (reaccionando al mensaje).\n- Cuando una persona reclama una fruta, esta será suya hasta que se salga del server. Piensa dos veces antes de agarrar una!\n- Cada Hanasu no Mi otorga una habilidad especial. Estas habilidades son unicas, y solo hay un tipo de cada fruta\n- La muerte le aguarda a aquel que intente comer mas de 2 frutas\n- Puede ver cuantas frutas quedan con **` +
                prefix +
                `Fruits Left**, y puedes saber más de tu fruta con **` +
                prefix +
                `Info**"\n- No hay forma de saber que hace cada fruta hasta que la comas, asi que solo queda registrar las frutas a prueba y error!`,
        );
    }
    if (message.content.toLowerCase() === prefix + "info") {
        message.channel.send(propiedaesFruta(message));
    }
    if (message.content.toLowerCase() === prefix + "credits") {
        message.channel.send(
            "Este genial bot fue creado por el gran Patricio (Fundador de los Rollos Legendarios y fan de Persona5)",
        );
    }
    if (message.content.toLowerCase() === prefix + "commands") {
        message.channel.send(
            `# Hanasu no Mi: Comandos\n- **` +
                prefix +
                `Help**: Informacion general del bot\n- **` +
                prefix +
                `Users**: muestra los usuarios con fruta\n- **` +
                prefix +
                `Info**: Obten informacion de tu fruta\n- **` +
                prefix +
                `Fruits Left**: Mira cuantas frutas hay disponibles en el server`,
        );
    }
    if (message.content.toLowerCase() === prefix + "fruits left") {
        const frutas = getFrutas(); // Obtener todas las frutas
        const frutasDisponibles = frutas.frutas.filter(
            (fruta) => fruta.owner === null,
        ); // Filtrar las que no tienen dueño
        const cantidadFrutasDisponibles = frutasDisponibles.length; // Contar las frutas disponibles

        message.channel.send(
            `Frutas disponibles: ${cantidadFrutasDisponibles}/${frutas.frutas.length}`,
        );
    };
    if (message.content.toLowerCase() === prefix + "permisos") {
        console.log("Guild:", message.guild);
    };
});

// HABILIDADES
const cooldowns = new Map();
client.on("messageCreate", (message) => {
    //Kuse Kuse no Mi
    const usuarios = getUsuarios();
    const usuario = usuarios.usuarios.find((u) => u.id === message.author.id); // Usar el ID del autor del mensaje

    //Kuse Kuse no Mi
    if (usuario && usuario.nombre === "Kuse Kuse no Mi") {
        // Verifica si el usuario tiene la fruta
        if (message.content.toLowerCase().startsWith("color")) {
            const messageWithoutCommand = message.content.slice(6).trim(); // Elimina "!Color" y el espacio
            message.delete(); // Borra el mensaje original
            webhookColor(messageWithoutCommand); // Llama a webhookColor
        }
    }

    //Sasu Sasu no Mi
    if (usuario && usuario.nombre === "Sasu Sasu no Mi") {
        if (message.content.toLowerCase().startsWith("tell")) {
            const args = message.content.slice(5).trim().split(" "); // Obtener los usuarios mencionados
            const mensaje = args.slice(1).join(" "); // Mensaje que se enviará
            // Si no hay menciones o mensaje vacío
            if (args.length < 2 || mensaje === "") {
                message.reply(
                    "Debes mencionar usuarios y escribir un mensaje.",
                );
                return;
            }

            // Enviar el mensaje como susurro solo a los mencionados
            enviarSusurro(message, args[0], mensaje);
        }
    }

    //Oku Oku no Mi
    if (usuario && usuario.nombre === "Oku Oku no Mi") {
        // Verifica si el usuario tiene la fruta
        if (message.content.toLowerCase().startsWith("oku")) {
            aplicarSlowmodeCanal(message);
        }
    }

    //Kana Kana no Mi
    if (usuario && usuario.nombre === "Kana Kana no Mi") {
        // Verifica si el usuario tiene la fruta
        if (message.content.toLowerCase().startsWith("serios!")) {
            aplicarSerio(message);
        }
    }
});

// FUNCION
async function aplicarSerio(message) {
    // Verifica si el mensaje contiene la palabra "serio" (case insensitive)
    if (message.content.toLowerCase().includes("serios!")) {
        const canal = message.channel;
        const usuarioQueDijoSerio = message.author;

        // Notifica al canal sobre la desactivación de reacciones
        canal.send("Un aura lugubre se extiende por la zona...");

        // Desactiva las reacciones para el canal
        await canal.permissionOverwrites.create(
            canal.guild.roles.everyone,
            {
                [PermissionsBitField.Flags.AddReactions]: false, // Cambia según el nombre correcto del permiso
            },
            { reason: "Kana Kana no Mi activada" },
        );

        // Permite al usuario que dijo "serio" seguir agregando reacciones
        await canal.permissionOverwrites.create(
            usuarioQueDijoSerio,
            {
                [PermissionsBitField.Flags.AddReactions]: true,
            },
            {
                reason: "El usuario de la Kana Kana no Mi puede seguir reaccionando",
            },
        );

        // Restablece las reacciones después de 1 minuto
        setTimeout(() => {
            canal.permissionOverwrites.create(
                canal.guild.roles.everyone,
                {
                    [PermissionsBitField.Flags.AddReactions]: true,
                },
                { reason: "Kana Kana no Mi desactivada" },
            );

            canal.send("De la nada... la vida tiene un poco más de optimismo");
        }, 60000); // medio minuto
    }
}

function aplicarSlowmodeCanal(message) {
    const usuario = message.author;

    if (cooldowns.has(usuario.id)) {
        const cooldownEnd = cooldowns.get(usuario.id);
        const tiempoRestante = cooldownEnd - Date.now();

        if (tiempoRestante > 0) {
            const tiempoRestanteMinutos = Math.ceil(tiempoRestante / 60000);
            message.channel.send(
                `Debes esperar ${tiempoRestanteMinutos} minuto(s) antes de volver a usar este comando.`,
            );
            return;
        }
    }
    
    message.channel.setRateLimitPerUser(5, `Oku Oku no Mi Activada!`);

    setTimeout(() => {
        message.channel.setRateLimitPerUser(0, `Oku Oku no Mi desactivada`);
    }, 30000); // Medio minuto

    cooldowns.set(usuario.id, Date.now() + 300000); // 5 minutos en milisegundos
}

function propiedaesFruta(message) {
    const usuarios = getUsuarios(); // Función para obtener la lista de usuarios
    const frutas = getFrutas(); // Función para obtener la lista de frutas
    const userId = message.author.id;

    // Busca el usuario en la lista
    const usuario = usuarios.usuarios.find((u) => u.id === userId);

    if (usuario) {
        const frutaNombre = usuario.nombre; // Obtiene la fruta del usuario

        if (frutaNombre) {
            const fruta = frutas.frutas.find((f) => f.name === frutaNombre);

            if (fruta) {
                // Redacta las propiedades de la fruta
                return (
                    `**Fruta de <@${usuario.id}>:**\n\n` +
                    `Nombre: ${fruta.name} (${fruta.nameRom})\n` +
                    `Descripción: ${fruta.descripcion}\n`
                );
            }
        } else {
            return `**${usuario.nombre}** no posee ninguna fruta.`;
        }
    } else {
        return `Usuario no encontrado.`;
    }
}

function enviarSusurro(message, usuarioMencionado, mensaje) {
    message.delete(); // Elimina el mensaje original para mantener el susurro secreto

    // Enviar el mensaje como un mensaje efímero (solo visible para el autor y el usuario mencionado)
    const embed = new EmbedBuilder().setDescription(
        `**Susurro a ${usuarioMencionado.username}:** ${mensaje}`,
    );

    // Usamos 'send' para enviar un mensaje en el canal
    message.channel
        .send({
            embeds: [embed],
            allowedMentions: { users: [usuarioMencionado.id] },
        })
        .then((sentMessage) => {
            // Solo el usuario mencionado puede verlo y reaccionar, si así lo deseas.
            sentMessage.react("👁️"); // React con un ojo para indicar que es un mensaje secreto
        })
        .catch(console.error);
}

async function webhookColor(message) {
    // Obtén la fruta Kuse Kuse no Mi
    const frutas = getFrutas();
    const fruta = frutas.frutas.find(f => f.name === "Kuse Kuse no Mi");
    if (!fruta) {
        console.error("No se encontró la fruta 'Kuse Kuse no Mi'");
        return;
    }

    const ownerId = fruta.owner; // ID del dueño de la fruta
    
    const webhook = new WebhookClient({
        url: "https://discord.com/api/webhooks/1298825224376156172/MotNh5CuyO9z-oyE_Vf8XF3e989TMjajiAJXLrlDDzBm9xfRHVgg99Lt2EEW1u_nmFBe",
    });

    try {
        // Obtiene el usuario de Discord
        const user = await client.users.fetch(ownerId);

        // Si el usuario está en el servidor, obten su apodo
        const guildMember = await client.guilds.cache
            .first()
            .members.fetch(ownerId);
        const nickname = guildMember
            ? guildMember.nickname || user.username
            : user.username; // Usa el apodo si existe

        // Agregar color simulando con bloques de código
        const colors = [1, 2, 3, 4, 5, 6]; // Diferentes estilos de bloque de código
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        // Agregar color simulando con bloques de código
        const coloredMessage = `\`\`\`ansi\n[2;3${randomColor}m${message}[0m\n\`\`\``; // Mensaje en bloque de código

        // Envía un mensaje como si fuera el usuario con bloque de código
        webhook.send({
            content: coloredMessage,
            username: nickname, // Nombre del usuario que simulas
            avatarURL: user.displayAvatarURL(), // URL de la imagen que deseas usar
        });
    } catch (error) {
        console.error("Error al obtener el usuario:", error);
    }
}


async function webhookGeneral(message, userId) {
    const webhook = new WebhookClient({
        url: "https://discord.com/api/webhooks/1298839594636148777/VWR2-TmWj9PlHik14xGwyU1KjwDP1_sdazCXoDzHC2baTqZYXsL7bQP9cso6sb35Uf1l",
    });

    try {
        // Obtiene el usuario de Discord
        const user = await client.users.fetch(userId);

        // Si el usuario está en el servidor, obten su apodo
        const guildMember = await client.guilds.cache
            .first()
            .members.fetch(userId);
        const nickname = guildMember
            ? guildMember.nickname || user.username
            : user.username; // Usa el apodo si existe

        // Envía un mensaje como si fuera el usuario
        webhook.send({
            content: message,
            username: nickname, // Nombre del usuario que simulas
            avatarURL: user.displayAvatarURL(), // URL de la imagen que deseas usar
        });
    } catch (error) {
        console.error("Error al obtener el usuario:", error);
    }
}


function resetHanasu() {
    const frutas = getFrutas(); // Obtiene la lista de frutas
    const usuarios = getUsuarios(); // Obtiene la lista de usuarios

    // Restablece todas las frutas a owner: null
    frutas.frutas.forEach((fruta) => {
        fruta.owner = null; // Establece el propietario de la fruta como null
    });

    // Limpia la lista de usuarios
    usuarios.usuarios = []; // Elimina todos los usuarios

    // Guarda los cambios en los archivos JSON
    guardarFrutasRst(frutas); // Guarda las frutas en la base de datos
    guardarUsuariosRst(usuarios); // Guarda la lista vacía de usuarios en la base de datos
}

function eliminarFrutaDeUsuario(userId) {
    guardarUsuarios(userId, null, null);
    frutaOwnNull(userId);
}


function frutaOwnNull(userId) {
    const frutas = getFrutas(); // Obtiene la lista de frutas

    // Busca la fruta cuyo owner sea el ID del usuario
    const fruta = frutas.frutas.find((f) => f.owner === userId);

    // Si se encuentra la fruta, establece su propietario como null
    if (fruta) {
        fruta.owner = null; // Establece el propietario de la fruta como null

        // Guarda la fruta en la base de datos (actualizada)
        guardarFrutas(
            fruta.name,
            fruta.nameRom,
            fruta.descripcion,
            fruta.imagen,
            fruta.owner,
        );
        console.log(
            `El propietario de la fruta ${fruta.name} ha sido establecido a null.`,
        );
    } else {
        console.log(
            `No se encontró ninguna fruta asociada al usuario con ID: ${userId}`,
        );
    }
}

function obtenerFrutasSinOwner() {
    const frutasSinOwner = [];
    const frutas = getFrutas();

    // Asegúrate de que frutas esté definido
    frutas.frutas.forEach((fruta) => {
        if (fruta.owner === null) {
            frutasSinOwner.push(fruta);
        }
    });

    return frutasSinOwner;
}

function mostrarFrutas(message) {
    const frutas = getFrutas();
    console.log("Frutas cargadas:", frutas); // Agrega este log para depurar

    let respuesta = "Frutas y sus propiedades:\n";

    if (frutas.frutas && frutas.frutas.length > 0) {
        frutas.frutas.forEach((fruta) => {
            respuesta += `**${fruta.name}** - Dueño: <@${fruta.owner ? fruta.owner : "Null"}> , Descripción: ${fruta.descripcion}\n`;
        });
    } else {
        respuesta = "No hay frutas disponibles."; // Mensaje alternativo si no hay frutas
    }

    message.channel.send(respuesta);
}

function mostrarUsuarios(message) {
    const usuarios = getUsuarios(); // Obtener la lista de usuarios
    let respuesta = "Usuarios y sus frutas:\n";

    // Verifica si hay usuarios
    if (usuarios && usuarios.usuarios && usuarios.usuarios.length > 0) {
        for (const usuario of usuarios.usuarios) {
            // Asegúrate de que cada usuario tenga una propiedad 'id' y 'fruta'
            const userId = usuario.id; // ID del usuario
            const fruta = usuario.nombre || "Ninguna"; // Fruta del usuario, o 'Ninguna' si no tiene
            const member = message.guild.members.cache.get(userId);
            const nickname = member
                ? member.nickname || member.user.username
                : "Usuario no encontrado";

            // Usar `<@${userId}>` para mencionar al usuario
            respuesta += `**${nickname}** - ${fruta} (${usuario.nombreRom})\n`;
        }
    } else {
        respuesta = "No hay usuarios de fruta."; // Mensaje alternativo si no hay usuarios
    }

    message.channel.send(respuesta); // Envía la respuesta al canal
}

// Inicia el bot
client.login(token);