import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getSMTPTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  // Check if real SMTP is configured (for production)
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (smtpHost && smtpUser && smtpPass) {
    // Use real SMTP provider
    console.log('📧 Using real SMTP provider:', smtpHost);
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    return transporter;
  }

  // Fallback to Ethereal Email (testing only)
  const storedUser = process.env.ETHEREAL_USER;
  const storedPass = process.env.ETHEREAL_PASS;

  if (storedUser && storedPass) {
    console.log('⚠️  Using Ethereal Email (TESTING ONLY - emails are NOT delivered to real addresses)');
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: storedUser,
        pass: storedPass,
      },
    });
    return transporter;
  }

  // Create new Ethereal account
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('📧 New Ethereal Email account created (TESTING ONLY):');
  console.log('User:', testAccount.user);
  console.log('Pass:', testAccount.pass);
  console.log('\n⚠️  IMPORTANT: Ethereal Email does NOT send real emails!');
  console.log('⚠️  Emails are only available via preview URL in console logs.');
  console.log('⚠️  To send real emails, configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
  console.log('\nAdd these to your .env file for testing:');
  console.log(`ETHEREAL_USER=${testAccount.user}`);
  console.log(`ETHEREAL_PASS=${testAccount.pass}\n`);

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
}

