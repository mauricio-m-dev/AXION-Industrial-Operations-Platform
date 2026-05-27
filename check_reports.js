import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/axionops');
  const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));
  const tickets = await Ticket.find({ resolution_report: { $exists: true, $ne: '' } }).lean();
  console.log('Tickets with resolution_report:', tickets.map(t => ({ id: t.id, report: t.resolution_report })));
  process.exit();
}
run();
