const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Set session path - typically in user's home directory
const SESSION_PATH = path.join(process.env.SESSION_PATH || os.homedir(), '.wwebjs_auth');

// Check if the session files exist before initializing the client
const sessionExists = fs.existsSync(path.join(SESSION_PATH, 'session-my-session'));

console.log(`[DEBUG] Session path: ${SESSION_PATH}`);
console.log(`[DEBUG] Session exists: ${sessionExists}`);

// Track client initialization state
let clientReady = false;

const client = new Client({
    authStrategy: new LocalAuth({ 
        clientId: "my-session",
        dataPath: SESSION_PATH // Use existing session path only
    }),
    puppeteer: {
        // Use bundled Chromium instead of trying to find Chrome on the system
        headless: true, // Always run headless in deployment
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800',
            '--disable-popup-blocking', // Prevent pop-ups
            '--disable-infobars', // Prevent info bars
            '--disable-features=TranslateUI,BlinkGenPropertyTrees' // Further pop-up prevention
        ],
        defaultViewport: null
    },
    qrTimeoutMs: sessionExists ? 0 : 30000, // No timeout if session exists, else 30s for QR
    authTimeoutMs: sessionExists ? 0 : 30000, // No timeout if session exists, else 30s for auth
    takeoverOnConflict: true, 
    takeoverTimeoutMs: 0 // No timeout for takeover
});



// Debug command to check WhatsApp Web status
client.on('message_create', async message => {
    // Debug command
    if (message.body === '!debug') {
        try {
            const state = await client.getState();
            client.sendMessage(message.from, `Current WhatsApp state: ${state}`);
            
            // Check if connected
            client.sendMessage(message.from, 'Checking connection...');
            const connectionState = client.info ? 'Connected' : 'Not fully connected';
            client.sendMessage(message.from, `Connection: ${connectionState}`);
            
            // Try to load a chat
            client.sendMessage(message.from, 'Attempting to load current chat...');
            const chat = await message.getChat();
            client.sendMessage(message.from, `Current chat loaded: ${chat.name}`);
        } catch (error) {
            console.error('Debug error:', error);
            client.sendMessage(message.from, `Debug error: ${error.message}`);
        }
    }
    
    // List groups command with retry
    if (message.body === '!groups') {
        client.sendMessage(message.from, 'Fetching your groups... This may take a minute if you have many groups.');
        await sendGroupsList(message.from);
    }
    
    // Other commands from your original code...
    if (message.body === '!ping') {
        client.sendMessage(message.from, 'pong');
    }
});

// Helper function to send the groups list with retry
async function sendGroupsList(to) {
    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        if (groups.length === 0) {
            return client.sendMessage(to, 'You have no groups.');
        }
        
        const groupsList = groups.map((group, index) => 
            `${index + 1}. ${group.name} (${group.id._serialized})`
        ).join('\n');
        
        await client.sendMessage(to, `Your groups:\n${groupsList}`);
    } catch (error) {
        console.error('Error fetching groups:', error);
        await client.sendMessage(to, `Error fetching groups: ${error.message}`);
    }
}

    // Event listener for QR code
    client.on('qr', qr => {
        console.log("***********************************************************")

        console.log(qr)
        console.log("***********************************************************")
        console.log('No valid session found. Scan this QR code with your phone:');
        qrcode.generate(qr, { small: true });
    });
    //  function run() {
    //     const url = "2@AExSsm4tWo3o1KSG98KWefz7sYrIHqNbPG3801TjhhECgqqEuo9D2P3GrmEKW7LwqjWqFXdgrQopqA4CbqiUdZWpM6BowxGa9AQ=,wF/+coOpnIyxdTpeGZ6H6CndPNfsvfQrlKSlbk/2GTQ=,iVypVvs8ggRhmkzsROrFeMz21uXc54BLpLW48sLuD1Y=,IFVs0n1+1LP/BWggDqY3xu6z3Pv4e3nrgzHX1lwo1z0=,1"
    //     qrcode.generate(url, { small: true });

    // }

    // run()

const notifyUser = async (GROUP_NAME, payload) => {
    const targetChatId = "91" + payload.clientId + "@c.us";
    const message = `Hi ${payload.client_name},

We wanted to let you know that your job application request for the position of **${payload.job_title}** at **${payload.company_name}** has been received and assigned to our internal team member, **${GROUP_NAME}**. 

Our team is currently working on your request and will apply on your behalf shortly. You will be notified once the application has been successfully submitted. 

If you need any further assistance or have additional instructions, please feel free to reply.

**Thank you for choosing our service!**`;

    try {
        await client.sendMessage(targetChatId, message);
        console.log(`Message sent successfully to ${targetChatId}`);
        return true;
    } catch (error) {
        console.error(`Failed to send message to ${targetChatId}:`, error);
        return false;
    }
};

const notifyMember = async (groupName, payload) => {
    
const message = `**Hi ${groupName},**

You have been assigned a new job application request for our client **${payload.client_name}**. Here are the details:

- **Position:** ${payload.job_title}  
- **Company:** ${payload.company_name}  
- **Application applyLink:** ${payload.applyLink}  
- **Additional Instructions:** ${payload.additional_instructions || 'N/A'}

Please proceed with the application on behalf of the client and update the status as soon as it's submitted. If you need any additional information, feel free to reach out.

**Thank you for your efforts and support!**`;

    try {
        const group = await findTargetedGroup(groupName);
        if (!group) {
            console.error(`Group not found: ${groupName}`);
            return false;
        }
        await client.sendMessage(group.groupId, message);
        console.log(`Message sent successfully to ${groupName}`);
        return true;
    } catch (error) {
        console.error(`Failed to send message to ${groupName}:`, error);
        return false;
    }
};


const notifyForJobApplication = async (groupName, message) => {
    try {
        const group = await findTargetedGroup(groupName);
        if (!group) {
            console.error(`Group not found: ${groupName}`);
            return false;
        }
        await client.sendMessage(group.groupId, message);
        console.log(`Message sent successfully to ${groupName}`);
        return true;
    } catch (error) {
        console.error(`Failed to send message to ${groupName}:`, error);
        return false;
    }
};

const findTargetedGroup = async (groupName) => {
    console.log(`[DEBUG] findTargetedGroup called with groupName: ${groupName}`);

    try {
        console.log(`[DEBUG] Fetching all chats from client...`);
        const chats = await client.getChats();

        console.log(`[DEBUG] Total chats fetched: ${chats.length}`);
        const groups = chats.filter(chat => chat.id._serialized.includes('@g.us'));

        console.log(`[DEBUG] Total groups found: ${groups.length}`);
        const targetGroup = groups.find(group => 
            group.name?.toLowerCase().includes(groupName.toLowerCase())
        );

        if (!targetGroup) {
            console.warn(`[WARN] Group '${groupName}' not found in available groups.`);
            return null;
        }

        console.log(`[INFO] Found target group: ${targetGroup.name} (ID: ${targetGroup.id._serialized})`);

        return {
            groupId: targetGroup.id._serialized,
            groupName: targetGroup.name
        };
    } catch (error) {
        console.error(`[ERROR] Error finding targeted group '${groupName}':`, error);
        return null;
    }
};

// Event listener for when the client is ready with longer delay
client.on('ready', async () => {
    console.log('WhatsApp bot is ready and session is valid!');
});

// Handle authentication
client.on('authenticated', () => {
    console.log('WhatsApp session authenticated successfully!');
});

// Handle authentication failures
client.on('auth_failure', (error) => {
    console.error('Authentication failed:', error);
});

// Handle disconnections
client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
});

// Initialize the client
client.initialize()
    .catch(err => {
        console.error('Failed to initialize:', err);
    });


const getGroupNameByEmail = async (email) => {
    if (!email) {
        console.log("Email is required!");
        return null;
    }

    try {
        // TODO: replace the api endpoint for prod.
        //  get this api from internal dashboard 
        const response = await fetch('http://192.168.29.146:5000/get_group_name_by_email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.log(`Error: ${errorData.message}`);
            return null;
        }

        const data = await response.json();
        console.log(`Group Name: ${data.group_name}`);
        return data.group_name;
    } catch (error) {
        console.log("An error occurred:", error);
        return null;
    }
};
    
module.exports = {
    notifyUser,
    notifyMember,
    getGroupNameByEmail,
    notifyForJobApplication
}