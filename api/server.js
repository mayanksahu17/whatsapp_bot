// Import necessary modules using CommonJS syntax
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { UserSchema, HiredeasyUserSchema } = require('./models.js');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Express
const app = express();

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Allow CORS from all origins or specify your extension's origin
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigin = `chrome-extension://${process.env.EXTENSION_ID}`;
        callback(null, true);
        // TODO : uncomment the orgins after development 
        // if (origin && origin === allowedOrigin) {
        //     callback(null, true); // Allow the request from the Chrome extension
        // } else {
        //     callback(new Error('Not allowed by CORS'));
        // }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
};



// Use CORS to allow requests from other origins
app.use(cors(corsOptions));

// Create a write stream (in append mode) for logging to a file
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// Custom middleware for detailed logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
    });
    next();
});

// MongoDB connection string for the extension's database
const dbUri = process.env.LINKEDIN_MONGODB_URI;

if (!dbUri) {
    throw new Error('MONGODB_URI is not defined in the environment variables.');
}

// Connect to MongoDB
mongoose.connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected...'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit the application if the database connection fails
    });


const User = mongoose.model('User', UserSchema);


const hiredeasyUri = process.env.HIREDEASY_MONGODB_URI;
async function syncEmailsFromHiredeasy() {
    try {
        

        if (!hiredeasyUri) {
            throw new Error('HIREDEASY_URI is not defined in the environment variables.');
        }

        // Connect to the hiredeasy database (jobify)
        const hiredeasyConnection = await mongoose.createConnection(hiredeasyUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Check if the connection is established
        hiredeasyConnection.on('connected', () => {
            console.log('Connected to hiredeasy database');
        });


        const HiredeasyUser =  hiredeasyConnection.model('users', HiredeasyUserSchema);

        // Fetch emails from hiredeasy (jobify) database
        const hiredeasyUsers = await HiredeasyUser.find({});
        console.log('Hiredeasy users found:', hiredeasyUsers.length);

        const newUsers = [];

        // Collect users that need to be added to the extension's database
        for (const hiredeasyUser of hiredeasyUsers) {
            if (!hiredeasyUser.email) {
                // console.warn('Skipping user with missing email:', hiredeasyUser);
                continue;  // Skip users without an email
            }

            const existingUser = await User.findOne({ email: hiredeasyUser.email });

            if (!existingUser) {
                newUsers.push({ email: hiredeasyUser.email });
            }
        }

        // Bulk insert new users
        if (newUsers.length > 0) {
            await User.insertMany(newUsers);
            console.log(`Bulk inserted ${newUsers.length} new users`);
        }

        hiredeasyConnection.close();
    } catch (err) {
        console.error('Error during email sync:', err);
    }
}

// Run the sync function periodically or on server start
syncEmailsFromHiredeasy().catch(console.error);

async function watchForNewUsers() {
    try {
        const hiredeasyUri = process.env.HIREDEASY_MONGODB_URI;

        if (!hiredeasyUri) {
            throw new Error('HIREDEASY_URI is not defined in the environment variables.');
        }

        // Connect to the hiredeasy database (jobify)
        const hiredeasyConnection = await mongoose.createConnection(hiredeasyUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const hiredeasyUserCollection = await hiredeasyConnection.collection('users');

        const changeStream = await  hiredeasyUserCollection.watch();

        changeStream.on('change', async (change) => {
            if (change.operationType === 'insert') {
                const newUser = change.fullDocument; 
                console.log('Detected new user:', newUser.email);

                if (newUser.email) {
                    const existingUser = await User.findOne({ email: newUser.email });

                    if (!existingUser) {
                        await User.create({ email: newUser.email });
                        console.log(`New user synced with email: ${newUser.email}`);
                    }
                }
            }
        });

        console.log('Watching for new users in hiredeasy database...');
    } catch (err) {
        console.error('Error watching for new users:', err);
    }
}

// Start watching for new users
watchForNewUsers();




const  {router} = require('./routes.js');

app.use(router)

app.get('/', async(req,res)=>{
    res.send({"message" : "server is ready "})
});
// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port : http://localhost:${PORT}`)

});

module.exports = {
    User , hiredeasyUri
}