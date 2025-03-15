// Import necessary modules using CommonJS syntax
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const os = require('os');

// Determine Chrome path based on operating system
let chromePath;
if (os.platform() === 'win32') {
    // Windows
    chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
} else if (os.platform() === 'darwin') {
    // macOS
    chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
} else if (os.platform() === 'linux') {
    // Linux
    chromePath = '/usr/bin/google-chrome';
} else {
    console.error('Unsupported platform! Make sure Chrome is installed.');
    process.exit(1);
}

// Create a single client instance with proper configuration and longer timeout
const client = new Client({
    authStrategy: new LocalAuth({ 
        clientId: "my-session",
        dataPath: './.wwebjs_auth' // Explicitly set data path for session storage
    }),
    puppeteer: {
        executablePath: chromePath,
        headless: false,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800' // Larger window size
        ],
        defaultViewport: null
    },
    // Increase timeouts for loading
    qrTimeoutMs: 0, // No timeout for QR
    authTimeoutMs: 0, // No timeout for auth
    takeoverOnConflict: true, // Take over existing sessions
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

// Event listener for QR code
client.on('qr', qr => {
    console.log('No valid session found. Scan this QR code with your phone:');
    qrcode.generate(qr, { small: true });
});


const notifyUser = async (GROUP_NAME , payload) => {
    const targetChatId = "91" + payload.clientId + "@c.us";
    const message = `Hi ${payload.client_name},

We wanted to let you know that your job application request for the position of **${payload.job_title}** at **${payload.company_name}** has been received and assigned to our internal team member, **${GROUP_NAME}**. 

Our team is currently working on your request and will apply on your behalf shortly. You will be notified once the application has been successfully submitted. 

If you need any further assistance or have additional instructions, please feel free to reply.

**Thank you for choosing our service!**`;

    try {
        await client.sendMessage(targetChatId, message);
        console.log(`Message sent successfully to ${targetChatId}`);
    } catch (error) {
        console.error(`Failed to send message to ${targetChatId}:`, error);
    }
};

const notifyMember = async ( groupName, payload) => {
    
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
        await client.sendMessage(group.groupId, message);
        console.log(`Message sent successfully to ${groupName}`);
        return true

    } catch (error) {
        console.error(`Failed to send message to ${groupName}:`, error);
    }
};


const notifyForJobApplication = async ( groupName, message) => {
        try {
            const group = await findTargetedGroup(groupName);
            await client.sendMessage(group.groupId, message);
            console.log(`Message sent successfully to ${groupName}`);
            return true
    
        } catch (error) {
            console.error(`Failed to send message to ${groupName}:`, error);
        }
    };
const findTargetedGroup = async (groupName) => {
    try {
        const chats = await client.getChats();
        
        // Filter and find groups using "@g.us" identifier
        const groups = chats.filter(chat => chat.id._serialized.includes('@g.us'));
        
        // Find the specific group
        const targetGroup = groups.find(group => 
            group.name?.toLowerCase().includes(groupName.toLowerCase())
        );
        
        if (!targetGroup) {
            console.log(`Group '${groupName}' not found`);
            return null;
        }
        
        // Send message to the found group
        // await client.sendMessage(targetGroup.id._serialized, 'Hola amigo! 👋');
        
            return {
                groupId: targetGroup.id._serialized,
                groupName: targetGroup.name
            };
    } catch (error) {
        console.error('Error finding targeted group:', error);
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
            console.log("Mobile number is required!");
            return;
        }
    
        try {
            // TODO: replace the api endpoint for prod.
            //  get this api from internal dashboard 
            const response = await fetch('http://127.0.0.1:5000/get_group_name_by_email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                console.log(`Error: ${errorData.message}`);
                return;
            }
    
            const data = await response.json();
            console.log(`Group Name: ${data.group_name}`);
            return data.group_name;
        } catch (error) {
            console.log("An error occurred:", error);
        }
    };
    

    
    module.exports = {
        notifyUser,
        notifyMember,
        getGroupNameByEmail,
        notifyForJobApplication
    }