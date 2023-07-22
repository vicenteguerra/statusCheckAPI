const axios = require('axios');

module.exports = {
    mainCronJob: {
        task: async ({ strapi }) => {            
            console.log('Cron job is running');
            const {results: sites} = await strapi.services['api::site.site'].find();
            sites.forEach(async site => {                
                let {lastRunning, pulseSeconds} = site;
                if (lastRunning) lastRunning = new Date(lastRunning);
                let now = new Date();
                if(!lastRunning || (now.getTime() - lastRunning.getTime()) > pulseSeconds*1000){
                    let {responseCode, responseMiliseconds} = await checkSite(site, now);
                    console.log("Site: " + site.name + " - Response code: " + responseCode + " - Response time: " + responseMiliseconds);
                    let isUp = responseCode >= 200 && responseCode < 300; 
                    await strapi.services['api::site.site'].update(site.id, {data: {lastRunning: now, isUp: isUp}});
                    await strapi.services['api::status.status'].create({data: {site: site, date: now, success: isUp, responseCode: responseCode, responseMiliseconds: responseMiliseconds}});
                }
            });
                      
        },
        options: {
            rule: '*/10 * * * * *', // Every 10 seconds
        }
    }
}

async function checkSite(site, now){
    return new Promise((resolve, reject) => {         
        axios.get(site.url)
        .then(response => {
            const end = new Date().getTime();
            resolve({                
                responseCode: response.status,
                responseMiliseconds: end - now
            });
        })
        .catch(error => {   
            const end = new Date().getTime();                     
            resolve({                
                responseCode: error.response.status,
                responseMiliseconds: end - now
            });
        })
    })
}