import { pool } from '../../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import type { UserRow } from './auth.types';

export class AuthService {
  public static async registerUser(body: any): Promise<Omit<UserRow, 'password'>> {
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Validation failed. Missing required body inputs.');
    }

    const assignedRole = role || 'contributor';
    if (!['contributor', 'maintainer'].includes(assignedRole)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid user identity role selected.');
    }

    // Salt rounds configured directly between 8 and 12
    const hashedPassword = await bcrypt.hash(password, 10);

    const queryStr = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    
    const result = await pool.query(queryStr, [name, email, hashedPassword, assignedRole]);
    return result.rows[0];
  }

  public static async authenticateLogin(body: any): Promise<{ token: string; user: Omit<UserRow, 'password'> }> {
    const { email, password } = body;
    if (!email || !password) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Email and password are required.');
    }

    const queryStr = `SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1;`;
    const result = await pool.query(queryStr, [email]);
    
    if (result.rowCount === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid authorization credentials provided.');
    }

    const user: UserRow = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid authorization credentials provided.');
    }

    delete user.password;

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    return { token, user };
  }
}