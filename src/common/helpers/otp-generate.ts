export default function generateOtpAndExpiry() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpExpires = new Date(Date.now() + 1000 * 60 * 10);

  return { otp, otpExpires };
}
