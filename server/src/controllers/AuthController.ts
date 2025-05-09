import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET || "JWT_SECRET"; // Use uma variável de ambiente segura

class AuthController {
  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: "Usuário já cadastrado" });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const newUser = await prisma.user.create({ data: { email, password: hashedPassword, isAdmin:true } });
      res.status(201).json({ message: "Usuário registrado com sucesso", userId: newUser.id, email: newUser.email });
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      res.status(500).json({ error: "Erro ao registrar usuário" });
    }
  }

  async loginUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        res.status(401).json({ error: "Credenciais inválidas" });
        return;
      }
      const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, jwtSecret, { expiresIn: "1h" });
      res.status(200).json({ token });
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  }

  async registerPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, cpf, phone, birthDate, address, city, state, zipCode, country, password, number, complement } = req.body;

      const existingPatientByEmail = await prisma.patient.findUnique({ where: { email } });
      if (existingPatientByEmail) {
        const error = new Error("Paciente com este e-mail já cadastrado");
        (error as any).statusCode = 400;
        return next(error);
      }

      const existingPatientByCpf = await prisma.patient.findUnique({ where: { cpf } });
      if (existingPatientByCpf) {
        const error = new Error("Paciente com este CPF já cadastrado");
        (error as any).statusCode = 400;
        return next(error);
      }
      
      const existingPatientByPhone = await prisma.patient.findUnique({ where: { phone } });
      if (existingPatientByPhone) {
        const error = new Error("Paciente com este número de telefone já cadastrado");
        (error as any).statusCode = 400;
        return next(error);
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const patient = await prisma.patient.create({
        data: { name, email, cpf, phone, birthDate: new Date(birthDate), address, number, complement, city, state, zipCode, country, password: hashedPassword },
      });
      res.status(201).json({ message: "Paciente registrado com sucesso", patientId: patient.id, email: patient.email });
    } catch (error) {
      console.error("Erro ao registrar paciente:", error);
      return next(error);
    }
  }

  async loginPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const patient = await prisma.patient.findUnique({ where: { email } });
      if (!patient || !(await bcrypt.compare(password, patient.password))) {
        const error = new Error("Credenciais inválidas");
        (error as any).statusCode = 401;
        return next(error);
      }
      const token = jwt.sign({ patientId: patient.id }, jwtSecret, { expiresIn: "1h" });
      res.status(200).json({ token });
    } catch (error) {
      console.error("Erro ao fazer login do paciente:", error);
      return next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { userId, patientId, isAdmin } = req as any; // Corrigi aqui para usar isAdmin no caso de ser um usuário admin
    
    try {
      if (isAdmin && userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, isAdmin: true },
        });
        if (user) {
          res.status(200).json(user);
          return; // Indica que a função terminou aqui
        } else {
          res.status(404).json({ error: "Usuário não encontrado" });
          return; // Indica que a função terminou aqui
        }
      } else if (!isAdmin && patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { id: true, name: true, email: true, phone: true, cpf: true, birthDate: true, address: true, number: true, complement: true, city: true, state: true, zipCode: true, country: true, createdAt: true },
        });
        if (patient) {
          res.status(200).json(patient);
          return; // Indica que a função terminou aqui
        } else {
          res.status(404).json({ error: "Paciente não encontrado" });
          return; // Indica que a função terminou aqui
        }
      }
  
      res.status(400).json({ error: "Tipo de usuário inválido no token" });
      return; // Indica que a função terminou aqui
    } catch (error) {
      console.error("Erro ao buscar dados do usuário/paciente:", error);
      return next(error); // Passa o erro para o middleware de tratamento de erros
    }
  }
}
export default new AuthController();