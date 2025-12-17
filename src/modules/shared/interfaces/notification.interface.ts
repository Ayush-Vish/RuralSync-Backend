export interface INotificationPayload {
    to: string;
    subject: string;
    message: string;

}

export interface INotificationStrategy {
  send(payload: INotificationPayload): Promise<boolean>;
}
