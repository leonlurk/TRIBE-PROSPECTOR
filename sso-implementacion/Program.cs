// Ejemplo de código C#
using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;

public class JwtGenerator
{
    private readonly string _secretKey;

    public JwtGenerator(string secretKey)
    {
        _secretKey = secretKey;
    }

    public string GenerateToken(Dictionary<string, object> payload)
    {
        // 1. header
        var header = new Dictionary<string, string>
        {
            { "alg", "HS256" },
            { "typ", "JWT" }
        };

        // 2. Codificar el header en Base64Url
        string encodedHeader = Base64UrlEncode(JsonSerializer.Serialize(header));

        // 3. Codificar el payload en Base64Url
        string encodedPayload = Base64UrlEncode(JsonSerializer.Serialize(payload));

        // 4. Crear la firma con HMAC-SHA256
        string signature = CreateSignature(encodedHeader, encodedPayload);

        // 5. Crear el token JWT
        return $"{encodedHeader}.{encodedPayload}.{signature}";
    }

    private string CreateSignature(string encodedHeader, string encodedPayload)
    {
        string dataToSign = $"{encodedHeader}.{encodedPayload}";
        
        using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secretKey)))
        {
            byte[] signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
            return Base64UrlEncode(signatureBytes);
        }
    }

    private string Base64UrlEncode(string input)
    {
        byte[] inputBytes = Encoding.UTF8.GetBytes(input);
        return Base64UrlEncode(inputBytes);
    }

    private string Base64UrlEncode(byte[] input)
    {
        string base64 = Convert.ToBase64String(input);
        // Reemplazar los caracteres según la especificación Base64Url
        string base64Url = base64
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('='); // Eliminar el padding
        
        return base64Url;
    }
}

class Program
{
    static void Main()
    {
        // CLAVE SECRETA
        string secretKey = "x7J9#kL2$pQ5^zR3*mN6&wS8";
        
        // Crear payload con datos del usuario
        var payload = new Dictionary<string, object>
        {
            { "email", "ejemplo@dominio.com" },
            { "username", "usuario_ejemplo" },
            { "name", "Nombre" },
            { "lastname", "Apellido" },
            { "expiration_date", "2026-06-30T23:59:59Z" },
            { "sub", "user123" },
            { "exp", DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds() }
        };
        
        var jwtGenerator = new JwtGenerator(secretKey);
        string token = jwtGenerator.GenerateToken(payload);
        
        Console.WriteLine("Token JWT generado:");
        Console.WriteLine(token);
        
        // Para verificar, separar las partes
        string[] parts = token.Split('.');
        Console.WriteLine("\nPARTES DEL TOKEN:");
        Console.WriteLine($"Header: {parts[0]}");
        Console.WriteLine($"Payload: {parts[1]}");
        Console.WriteLine($"Signature: {parts[2]}");
        
        // Construir URL completa para redirección SSO
        string redirectUrl = $"https://iasystem.tribeinternational.net/sso?token={token}";
        Console.WriteLine("\nURL para SSO:");
        Console.WriteLine(redirectUrl);
    }
}