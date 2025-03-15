
// Import necessary modules using CommonJS syntax
const {  hiredeasyUri } = require('./server.js');
const { notifyMember, notifyUser , getGroupNameByEmail , notifyForJobApplication } = require('./utility.js');
const { HiredeasyUserSchema , UserSchema } = require('./models.js');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');







const User = mongoose.model('User',UserSchema)
// Improved API route to store job details
const storeJobDetails = async (req, res) => {
    const { email, jobDetails, username, mobileNumber } = req.body;

    // Input validation
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    // unique id for jobs 
    jobDetails.uniqueId = uuidv4().replace(/-/g, '');



    try {
        // Find user by email with proper error handling
        const user = await User.findOne({ email }).exec();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a structured job entry
        const jobEntry = {
            ...jobDetails,
            username,
            mobileNumber,
            dateAdded: new Date(),
            status: 'tracked' // Optional: add a default status
        };

        // Add job to user's jobs array and save

        user.jobs.push(jobEntry);
        const savedUser = await user.save();

        // Return more detailed success response
        res.status(201).json({ 
            success: true, 
            jobId: savedUser.jobs[savedUser.jobs.length - 1]._id,
            message: 'Job details successfully saved'
        });
    } catch (err) {
        console.error('Error saving job details:', err);
        
        // Differentiate between validation and server errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: err.errors 
            });
        }

        res.status(500).json({ 
            error: 'Internal server error', 
            message: 'Unable to save job details' 
        });
    }
};



const checkEmail =  async (req, res) => {
    const { email } = req.body;
    console.log(`Checking if email exists: ${email}`);

    try {
      

        // Connect to the hiredeasy database (jobify)
        const hiredeasyConnection = await mongoose.createConnection(process.env.HIREDEASY_MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        const HiredeasyUser =  hiredeasyConnection.model('users', HiredeasyUserSchema);
     
        // const user = await User.findOne({ email });
        
        
        
        // Fetch emails from hiredeasy (jobify) database
        //  TODO : optimise query by excluding unncessery feilds 
        const hiredeasyUser = await HiredeasyUser.findOne({'email' :email });
        

        console.log('Hiredeasy user found:', hiredeasyUser?.profiles[0]?.personalInfo.phone);
        const username = hiredeasyUser.firstName + " " + hiredeasyUser.lastName
        console.log('Hiredeasy user name:' ,username );
        const number = hiredeasyUser?.profiles[0]?.personalInfo.phone || null;
        // const number =  null;
        res.json({ exists: true , mobileNumber :number  , username : username});
        // if (user) {
        //     res.json({ exists: true , mobileNumber :number  , username : username});
        // } else {
        //     res.json({ exists: false });
        // }
    } catch (err) {
        console.error('Error checking email:', err);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}
const notifyUsers = async (req, res) => {
    const { 
        client_name,
        job_title,
        company_name,
        application_deadline,
        additional_instructions ,
        applyLink,
        clientId
    } = req.body;




    try {
        // Notify the specified group
        console.log(clientId);
        
        const GROUP_NAME = await getGroupNameByEmail(clientId)

        const notificationResult = await notifyMember(GROUP_NAME, {
            client_name,
            job_title,
            company_name,
            application_deadline,
            additional_instructions,
            applyLink,
            clientId
        });

        // Send response based on notification result
        if (notificationResult) {
            res.status(200).json({ 
                success: true, 
                message: `Notification sent to ${GROUP_NAME} group`
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: `Failed to send notification to ${GROUP_NAME} group`
            });
        }
    } catch (error) {
        console.error('Error in notifyUsers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
};
const sendMessage = async (req , res) => {
    const { groupName , message} = req.body
    const flag = notifyForJobApplication( groupName , message)
    res.send({
        success : true,
        message : "group notified succesfully"
    })
}
module.exports = {
    notifyUsers ,
    storeJobDetails,
    checkEmail,
    sendMessage
}