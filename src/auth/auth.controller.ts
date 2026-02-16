import { Controller, Post, Get, Put, Body, UseGuards, Request, Res, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('steam')
  @UseGuards(AuthGuard('steam'))
  async steamLogin() {
    // Initiates the Steam login flow
  }

  @Get('steam/return')
  @UseGuards(AuthGuard('steam'))
  async steamAuthReturn(@Request() req, @Res() res: Response) {
    const authData = this.authService.generateJwtForSteam(req.user);
    
    // MODIFICARE AICI: Scoatem "api." din link!
    // Trimitem userul către FRONTEND (Vercel), nu către BACKEND (Render)
    res.redirect(`https://skintrend.skin/trade?token=${authData.access_token}`);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.username, body.password);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  // ACTUALIZAT: Acum acceptă și email
  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(
    @Request() req, 
    @Body() body: { tradeLink?: string, newPassword?: string, email?: string }
  ) {
    return this.authService.updateProfile(
      req.user.userId, 
      body.tradeLink, 
      body.newPassword, 
      body.email
    );
  }

  // NOU: Ruta pentru a trimite mail-ul de verificare
  @UseGuards(AuthGuard('jwt'))
  @Post('send-verification')
  async sendVerification(@Request() req, @Body('email') email: string) {
    return this.authService.sendVerificationEmail(req.user.userId, email);
  }

  // NOU: Ruta publică pentru confirmarea efectivă
  @Get('confirm-email/:token')
  async confirmEmail(@Param('token') token: string) {
    return this.authService.confirmEmail(token);
  }
}