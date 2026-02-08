export const sendSMS = async (phoneNumber, message) => {
    // In a real app, this would call Twilio / Fast2SMS API
    // functionality is simulated here.
    console.log(`[SMS MOCK] To: ${phoneNumber}, Msg: ${message}`);
    return true;
};
