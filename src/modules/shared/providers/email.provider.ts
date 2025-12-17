import { INotificationStrategy, INotificationPayload } from '../interfaces/notification.interface';

export class EmailNotificationStrategy implements INotificationStrategy {
    async send({ to, subject, message }: INotificationPayload): Promise<boolean> {
        console.log(`📧 Sending EMAIL to ${to}: [${subject}] ${message}`);
        // Real logic: await transporter.sendMail(...)
        return true;
    }
}
