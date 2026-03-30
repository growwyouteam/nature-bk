require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_97NRDKLa_J3cAYgSNe1Qt4cco7eNDkqhg');

async function testEmail() {
  try {
    const data = await resend.emails.send({
      from: 'Nature Store <onboarding@resend.dev>',
      to: 'sharmaji980780@gmail.com',
      subject: 'Test Email',
      html: '<strong>It works!</strong>'
    });
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmail();
