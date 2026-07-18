package com.musicamasvida.smartwatch

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {
    
    // URL de tu API local (cambiar por IP local ej: http://192.168.1.X:3000 si usas dispositivo real)
    private val API_URL = "http://10.0.2.2:3000/auth/smartwatch/login"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WearApp(this)
        }
    }

    fun login(pin: String, onSuccess: (String) -> Unit, onError: (String) -> Unit) {
        Thread {
            try {
                val url = URL(API_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val jsonInputString = "{\"pin\": \"$pin\"}"
                connection.outputStream.use { os ->
                    val input = jsonInputString.toByteArray(Charsets.UTF_8)
                    os.write(input, 0, input.size)
                }

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val jsonObject = JSONObject(response)
                    val token = jsonObject.getString("accessToken")
                    onSuccess(token)
                } else {
                    onError("PIN incorrecto o expirado")
                }
            } catch (e: Exception) {
                onError("Error de conexión: ${e.message}")
            }
        }.start()
    }
}

@Composable
fun WearApp(activity: MainActivity) {
    var pin by remember { mutableStateOf("") }
    var token by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }

    MaterialTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colors.background),
            contentAlignment = Alignment.Center
        ) {
            if (token == null) {
                // Pantalla de Login por PIN
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(text = "Ingresa el PIN", textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = pin.ifEmpty { "------" }, 
                        style = MaterialTheme.typography.display1,
                        color = Color.Cyan
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Simple teclado numérico simulado (en Wear OS real se usaría un componente de teclado o scroll)
                    Row {
                        Button(onClick = { if (pin.length < 6) pin += "1" }) { Text("1") }
                        Spacer(modifier = Modifier.width(4.dp))
                        Button(onClick = { if (pin.length < 6) pin += "2" }) { Text("2") }
                        Spacer(modifier = Modifier.width(4.dp))
                        Button(onClick = { if (pin.length < 6) pin += "3" }) { Text("3") }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row {
                        Button(
                            onClick = { 
                                if (pin.length > 0) pin = pin.dropLast(1) 
                            },
                            colors = ButtonDefaults.secondaryButtonColors()
                        ) { Text("Del") }
                        Spacer(modifier = Modifier.width(4.dp))
                        Button(
                            onClick = {
                                if (pin.length == 6) {
                                    isLoading = true
                                    message = "Conectando..."
                                    activity.login(pin, 
                                        onSuccess = { jwt ->
                                            token = jwt
                                            isLoading = false
                                            message = ""
                                        },
                                        onError = { err ->
                                            message = err
                                            isLoading = false
                                            pin = ""
                                        }
                                    )
                                } else {
                                    message = "El PIN debe tener 6 dígitos"
                                }
                            },
                            enabled = pin.length == 6 && !isLoading
                        ) { 
                            Text("OK") 
                        }
                    }
                    if (message.isNotEmpty()) {
                        Text(text = message, color = Color.Red, style = MaterialTheme.typography.caption2)
                    }
                }
            } else {
                // Pantalla Principal Protegida
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("¡Bienvenido!", color = Color.Green)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Recordatorio: Tomar Pastilla a las 08:00 AM", style = MaterialTheme.typography.caption2, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Actividad: Caminata (30 min)", style = MaterialTheme.typography.caption2, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { 
                        token = null 
                        pin = ""
                    }) {
                        Text("Cerrar Sesión")
                    }
                }
            }
        }
    }
}
