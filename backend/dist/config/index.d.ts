interface AwsConfig {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    s3Bucket: string;
}
interface Config {
    port: number;
    nodeEnv: string;
    mongoUri: string;
    jwtSecret: string;
    jwtAccessExpiresIn: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiresIn: string;
    googleClientId: string;
    frontendUrl: string;
    corsOrigins: string[];
    emailUser: string;
    emailPassword: string;
    aws: AwsConfig;
    fastapiUrl: string;
    storageProvider: 's3' | 'local';
    localStoragePath: string;
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map