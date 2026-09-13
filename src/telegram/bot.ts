import TelegramBot from 'node-telegram-bot-api';
import { JobClassification } from '../ai/classifier';

export class TelegramNotifier {
  private bot: TelegramBot;
  private chatId: string;

  constructor(token: string, chatId: string) {
    this.bot = new TelegramBot(token, { polling: false });
    this.chatId = chatId;
  }

  async sendHiringAlert(
    job: JobClassification,
    discordUrl: string,
    author: string,
    channelName: string
  ): Promise<void> {
    const title = job.job_title || 'New Job Opportunity';
    const company = job.company_or_project ? `\n🏢 <b>Company/Project:</b> ${this.escapeHtml(job.company_or_project)}` : '';
    const jobType = job.job_type ? `\n💼 <b>Role Type:</b> ${this.escapeHtml(job.job_type)}` : '';
    const location = job.location_remote ? `\n🌍 <b>Location:</b> ${this.escapeHtml(job.location_remote)}` : '';
    const salary = job.salary_budget ? `\n💰 <b>Budget/Salary:</b> ${this.escapeHtml(job.salary_budget)}` : '';
    const skills = job.required_skills && job.required_skills.length > 0
      ? `\n⚡ <b>Required Skills:</b> ${job.required_skills.map(s => `<code>${this.escapeHtml(s)}</code>`).join(', ')}`
      : '';
    const summary = job.summary ? `\n\n📝 <b>Summary:</b>\n${this.escapeHtml(job.summary)}` : '';
    const contact = job.contact_info ? `\n\n📩 <b>Contact:</b> ${this.escapeHtml(job.contact_info)}` : '';

    const message = `🚨 <b>NEW HIRING POST APPROVED</b> 🚨\n\n` +
      `📌 <b>Role:</b> ${this.escapeHtml(title)}` +
      `${company}${jobType}${location}${salary}${skills}` +
      `\n👤 <b>Posted By:</b> ${this.escapeHtml(author)} in #${this.escapeHtml(channelName)}` +
      `${summary}${contact}`;

    await this.bot.sendMessage(this.chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Open Post in Discord',
              url: discordUrl
            }
          ]
        ]
      }
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
