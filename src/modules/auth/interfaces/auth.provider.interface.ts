export interface IUserProfile {
    email: string;
    name?: string;
    providerId: string;


}


export interface IAuthProvider {
    verifyToken(token: string): Promise<IUserProfile>;
}
