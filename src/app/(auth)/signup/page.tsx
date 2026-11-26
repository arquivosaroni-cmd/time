"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useAuth, initiateEmailSignUp } from "@/firebase";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleSignUp = async () => {
    if (!auth || !firestore) return;

    if (!fullName || !email || !password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome completo, e-mail e senha.",
      });
      return;
    }

    setIsSigningUp(true);

    try {
      const userCredential = await initiateEmailSignUp(auth, email, password);
      if (userCredential && userCredential.user) {
        const user = userCredential.user;
        
        const photoUrl = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
        await updateProfile(user, { displayName: fullName, photoURL: photoUrl });

        const batch = writeBatch(firestore);

        const userProfileRef = doc(firestore, "users", user.uid, "profile", user.uid);
        batch.set(userProfileRef, {
          id: user.uid,
          name: fullName,
          email: user.email,
          photoUrl: photoUrl,
          whatsapp: whatsapp,
          createdAt: serverTimestamp(),
        });

        const userRootRef = doc(firestore, "users", user.uid);
         batch.set(userRootRef, {
          id: user.uid,
          name: fullName,
          email: user.email,
          photoUrl: photoUrl,
          whatsapp: whatsapp,
        });

        await batch.commit();
      }
      router.push("/");
    } catch (error: any) {
      let title = "Erro ao criar conta";
      let description = "Ocorreu um erro inesperado. Tente novamente.";

      if (error.code === 'auth/weak-password') {
        title = "Senha fraca";
        description = "Sua senha deve ter pelo menos 6 caracteres.";
      } else if (error.code === 'auth/email-already-in-use') {
        title = "E-mail já cadastrado";
        description = "Este endereço de e-mail já está sendo utilizado por outra conta.";
      }

      toast({
        variant: "destructive",
        title: title,
        description: description,
      });

      console.error("Erro ao criar conta:", error);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Cadastre-se</CardTitle>
        <CardDescription>
          Digite suas informações para criar uma conta
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="full-name">Nome completo</Label>
          <Input 
            id="full-name" 
            placeholder="John Doe" 
            required 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSigningUp}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="m@exemplo.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSigningUp}
          />
        </div>
         <div className="grid gap-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input 
            id="whatsapp" 
            placeholder="(XX) XXXXX-XXXX" 
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            disabled={isSigningUp}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSigningUp}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" onClick={handleSignUp} disabled={isSigningUp}>
          {isSigningUp ? "Criando conta..." : "Criar conta"}
        </Button>
        <div className="text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/login" className="underline">
            Entrar
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
