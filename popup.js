// Check if the user is already logged in when the page loads
chrome.storage.local.get(['loggedIn', 'email'], (result) => {
    if (result.loggedIn) {
        showJobDetailsSection(result.email);
        checkAndFillJobDetails();  // Check for job details and fill the fields if available
    } else {
        showLoginSection();
    }
});

// Function to show the login section
function showLoginSection() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('jobDetailsContainer').style.display = 'none';
    document.getElementById('extractedJobDetailsContainer').style.display = 'none';
    document.getElementById('h1').style.display = 'block'; // Ensure h1 is visible on login screen
    document.getElementById('instructionText').style.display = 'block'; // Ensure instructionText is visible on login screen
}

// Function to show the job details section and hide login elements
function showJobDetailsSection(email) {
    document.getElementById('status').textContent = `Welcome back, ${email}!`;
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('jobDetailsContainer').style.display = 'block';
    document.getElementById('extractedJobDetailsContainer').style.display = 'block';
    document.getElementById('h1').style.display = 'none'; // Hide h1 after login
    document.getElementById('instructionText').style.display = 'none'; // Hide instructionText after login
}

// Function to check and fill job details if they exist on the LinkedIn page
function checkAndFillJobDetails() {
    // Inject content script to check and fill job details
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                console.log("Script injected into the page");

                // Extract job details from the LinkedIn page
                const jobDetails = {
                    title: document.querySelector('h1.t-24')?.innerText || '',
                    company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText || '',
                    location: document.querySelector('div.t-black--light span')?.innerText || '',
                    applyLink: document.querySelector('h1.t-24 a')?.href || ''
                };

                // Send job details back to the popup script only if details are found
                if (jobDetails.title || jobDetails.company || jobDetails.location || jobDetails.applyLink) {
                    chrome.runtime.sendMessage({ action: 'fillJobDetails', jobDetails: jobDetails });
                }
            }
        });
    });
}

// Event listener for the "Login" button
document.getElementById('loginButton').addEventListener('click', () => {
    const email = document.getElementById('email').value;

    // Send a POST request to your server to check if the email exists
        // TODO : replace the URI for prod 
    fetch('http://localhost:5001/check-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(async(data) => {
        if (data.exists) {
            console.log(data);
            
            document.getElementById('status').textContent = "Login successful!";
            // Save the email and login status in Chrome's local storage
            if (data.mobileNumber === null ) {
                alert("Please complete your profile on hiredeasy.com");
                window.location.href = "https://hiredeasy.com";
                return;
            }
            await chrome.storage.local.set({ 'loggedIn': true, 'email': email , 'mobileNumber' : data.mobileNumber , 'username' : data.username }, () => {
                console.log('User logged in:', email);
            });

            // Show job details section and hide login elements
            showJobDetailsSection(email);

            // Check and fill job details if available
            checkAndFillJobDetails();
            
        } else {
            document.getElementById('status').textContent = "Email not found in database.";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('status').textContent = "Server error. Please try again later.";
    });
});


// function generateUniqueId() {
//     // Get the current timestamp in milliseconds
//     const timestamp = Date.now().toString(36);
    
//     // Generate a random number and convert it to base 36
//     const randomNum = Math.random().toString(36).substring(2, 10);
    
//     // Get a part of the user agent string to add some uniqueness based on the user's browser
//     const userAgent = navigator.userAgent;
//     const userHash = Array.from(userAgent)
//         .map(char => char.charCodeAt(0))
//         .reduce((sum, charCode) => sum + charCode, 0)
//         .toString(36);
    
//     // Combine timestamp, random number, and user agent hash to form a unique ID
//     const uniqueId = `${timestamp}-${randomNum}-${userHash}`;
//     console.log("@account id generated ");
    
//     return uniqueId;
// }



// Event listener for the "Extract" button
document.getElementById('extractButton').addEventListener('click', () => {
    const extractButton = document.getElementById('extractButton');
    
    // Prevent multiple clicks during execution
    if (extractButton.disabled) return;
    extractButton.disabled = true;

    console.log("Extract button clicked");

    chrome.storage.local.get('email', ({ email }) => {
        try {
            if (!email) {
                alert('User not logged in. Please log in first.');
                return;
            }

            
            

            // Inject content script to extract job details and send to the backend
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // Extract job details from the current page
                        const jobDetails = {
                            // jobId : generateUniqueId(),
                            title: document.querySelector('h1.t-24')?.innerText || '',
                            company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText || '',
                            location: document.querySelector('div.t-black--light span')?.innerText || '',
                            applyLink: document.querySelector('h1.t-24 a')?.href || ''
                        };

                        return jobDetails;
                    }
                }, (result) => {
                    let jobDetails = result[0].result;

                    // Function to check and highlight missing fields
                    const checkAndHighlightMissingFields = () => {
                        let missingFields = false;
                        const titleInput = document.getElementById('positionTitle');
                        const companyInput = document.getElementById('companyName');
                        const locationInput = document.getElementById('location');
                        const applyLinkInput = document.getElementById('applyLink');

                        // Update jobDetails with current input field values to validate after manual entry
                        jobDetails.title = titleInput.value.trim() || jobDetails.title;
                        jobDetails.company = companyInput.value.trim() || jobDetails.company;
                        jobDetails.location = locationInput.value.trim() || jobDetails.location;
                        jobDetails.applyLink = applyLinkInput.value.trim() || jobDetails.applyLink;

                        if (!jobDetails.title) {
                            titleInput.style.border = '2px solid red';
                            missingFields = true;
                        } else {
                            titleInput.style.border = '';
                        }
                        if (!jobDetails.company) {
                            companyInput.style.border = '2px solid red';
                            missingFields = true;
                        } else {
                            companyInput.style.border = '';
                        }
                        if (!jobDetails.location) {
                            locationInput.style.border = '2px solid red';
                            missingFields = true;
                        } else {
                            locationInput.style.border = '';
                        }
                        if (!jobDetails.applyLink) {
                            applyLinkInput.style.border = '2px solid red';
                            missingFields = true;
                        } else {
                            applyLinkInput.style.border = '';
                        }
                        return missingFields;
                    };

                    // Function to handle manual fill and validation
                    const manualFillHandler = () => {
                        if (!checkAndHighlightMissingFields()) {
                            // All fields are filled, proceed to send the job details to the backend
                            jobDetails.email = email;
                            sendJobDetailsToBackend(jobDetails);
                            extractButton.removeEventListener('click', manualFillHandler);
                        } else {
                            alert("Please fill in all the required fields.");
                        }
                    };

                    // If any fields are missing, allow manual input by the user
                    if (checkAndHighlightMissingFields()) {
                        alert("Some fields are missing. Please fill in the highlighted fields.");

                        extractButton.removeEventListener('click', manualFillHandler);
                        extractButton.addEventListener('click', manualFillHandler);
                    } else {
                        // If all fields are filled, proceed to send the job details to the backend
                        jobDetails.email = email;
                        sendJobDetailsToBackend(jobDetails);
                    }

                    // Re-enable the button after processing
                    extractButton.disabled = false;
                });
            });
        } catch (error) {
            console.error("Error during job extraction:", error);
            alert("An error occurred during job extraction.");
            extractButton.disabled = false;
        }
    });
});
async function sendJobDetailsToBackend(jobDetails) {
    try {
        // Retrieve user data from Chrome storage using async method
        const { username, mobileNumber, email } = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['username', 'mobileNumber', 'email'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });

        // Validate required fields
        if (!email) {
            throw new Error('User email is required');
        }

        const payload = {
            jobDetails,
            username,
            mobileNumber,
            email,
            
        };

        // Store job details
            // TODO : replace the URI for prod 
        const response = await fetch('http://localhost:5001/store-job-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to save job details');
        }

        const data = await response.json();
        console.log('Job details saved:', data);
        
        // Notify members after successful job storage
        try {
            await notifyMembers(email,jobDetails, username);
        } catch (notificationError) {
            console.error('Failed to notify members:', notificationError);
        }
        
        // Use a more user-friendly notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'path/to/success-icon.png',
            title: 'Job Details Saved',
            message: 'Job details successfully extracted and saved.'
        });
    } catch (error) {
        console.error('Error saving job details:', error);
        
        // Use a more user-friendly error notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'path/to/error-icon.png',
            title: 'Save Error',
            message: `Error saving job details: ${error.message}`
        });
    }
}

// New function to notify members
async function notifyMembers(email,jobDetails, submittedBy) {
    try {
        // Prepare notification payload
        const notificationPayload = {
            client_name: submittedBy, // Using the username as client name
            job_title: jobDetails.title,
            company_name: jobDetails.company,
            application_deadline: jobDetails.deadline || 'Not specified',
            additional_instructions: jobDetails.additionalInfo || 'No additional instructions',
            applyLink : jobDetails.applyLink,
            clientId : email
        };

        // Send notification to members
        // TODO : replace the URI for prod 
        const notifyResponse = await fetch('http://localhost:5001/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationPayload)
        });

        if (!notifyResponse.ok) {
            throw new Error('Failed to notify members');
        }

        const notifyData = await notifyResponse.json();
        console.log('Members notified successfully:', notifyData);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'path/to/error-icon.png',
            title: 'Saved',
            message: `job saving successfully`
        });
    } catch (error) {
        console.error('Error notifying members:', error);
        
        // Optional: Show notification about notification failure
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'path/to/warning-icon.png',
            title: 'Notification Warning',
            message: 'Failed to notify team members about the job.'
        });
    }
}

// Message listener for filling job details
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillJobDetails') {
        const { jobDetails } = request;
        
        // More robust field population with null checks
        const fieldsToPopulate = [
            { id: 'companyName', value: jobDetails.company },
            { id: 'positionTitle', value: jobDetails.title },
            { id: 'location', value: jobDetails.location },
            { id: 'applyLink', value: jobDetails.applyLink }
        ];

        fieldsToPopulate.forEach(field => {
            const element = document.getElementById(field.id);
            if (element && field.value) {
                element.value = field.value;
            }
        });

        // Optional: Send response back to confirm fields were populated
        sendResponse({ status: 'success' });
    }
});


// Listen for messages from the content script to fill job details in the input fields
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillJobDetails') {
        // Populate input fields with the extracted job details
        document.getElementById('companyName').value = request.jobDetails.company;
        document.getElementById('positionTitle').value = request.jobDetails.title;
        document.getElementById('location').value = request.jobDetails.location;
        document.getElementById('applyLink').value = request.jobDetails.applyLink;
    }
});

// Function to log out the user
document.getElementById('logoutLink').addEventListener('click', () => {
    chrome.storage.local.remove(['loggedIn', 'email', 'mobileNumber', 'username'], () => {
        document.getElementById('status').textContent = "You have logged out.";
        showLoginSection(); // Show the login section
        console.log('User logged out');
    });
});
