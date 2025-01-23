const cron = require('node-cron');
const { subDays, startOfDay, endOfDay } = require('date-fns');
const { ConnectionRequest } = require('../models/connectionRequest');

// This job will run at 8 am in the morning everyday
cron.schedule('* 8 * * *', async () => {
    console.log('Hello World' + new Date());
    // send email to all people who got request the previous day(yesterday)

    try {
        const yesterday = subDays(new Date(), 1);
        //const yesterday = subDays(new Date(), 0); // for testing purpose we are considering people who got request today
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);

        const pendingRequests = await ConnectionRequest.find({
            status: "interested",
            createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd },
        }).populate("fromUserId toUserId");

        const listOfEmails = [...new Set(pendingRequests.map((req) => req.toUserId.email))];

        for (const email of listOfEmails) {
            // this will only work in case of lte 500-1000 users, 
            //for more users we need to implement queueing system, else it will block the code
            // send email
            try {
                const res = await sendEmail.run('New Friend Request Pending' + email,
                    'You have a new friend request pending. Please login to your account to accept or reject the request.');
                console.log(res);
            } catch (error) {
                console.error(error);
            }
        }

    } catch (error) {
        console.error(error);
    }
});
