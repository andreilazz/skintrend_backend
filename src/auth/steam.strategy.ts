import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { AuthService } from './auth.service';

@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, 'steam') {
  constructor(private authService: AuthService) {
    super({
      returnURL: 'http://localhost:3001/auth/steam/return',
      realm: 'http://localhost:3001/',
      apiKey: '62847AB6EC700D43C379C563670A9B4F', // <--- PUNE CHEIA API AICI
    });
  }

  async validate(identifier: string, profile: any, done: Function) {
    // Trimitem profilul primit de la Steam catre serviciul nostru pentru a-l salva in DB
    const user = await this.authService.validateSteamUser(profile);
    return done(null, user);
  }
}