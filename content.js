if (window.location.hostname === 'www.linkedin.com') {
    const jobDetails = {};

    // Ensure the selectors match the LinkedIn DOM structure
    jobDetails.title = document.querySelector('div.jobs-unified-top-card__job-title')?.innerText || 'Not available';
    jobDetails.company = document.querySelector('a.jobs-unified-top-card__company-name')?.innerText || 'Not available';
    jobDetails.location = document.querySelector('li.jobs-unified-top-card__bullet')?.innerText || 'Not available';
    jobDetails.applylink = document.querySelector('a.jobs-apply-button')?.href || 'Not available';

    // Log the extracted job details for debugging
    console.log('Extracted Job Details:', jobDetails);
}
