/*
 * CENTINELA TIC — YARA Rules
 * Severity tags: CRITICAL | HIGH | MEDIUM | LOW
 */

rule EICAR_Test_String {
  meta:
    description = "EICAR Anti-Virus test string"
    severity = "HIGH"
  strings:
    $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
  condition:
    $eicar
}

rule Ransomware_Readme_Dropped {
  meta:
    description = "Ransomware ransom note dropped"
    severity = "CRITICAL"
  strings:
    $r1 = "YOUR FILES HAVE BEEN ENCRYPTED" nocase
    $r2 = "DECRYPT YOUR FILES" nocase
    $r3 = "bitcoin" nocase
    $r4 = "tor browser" nocase
    $r5 = "BTC" nocase
  condition:
    2 of them
}

rule Suspicious_PowerShell_Download {
  meta:
    description = "PowerShell with download cradle"
    severity = "HIGH"
  strings:
    $ps1 = "Invoke-WebRequest" nocase
    $ps2 = "DownloadString" nocase
    $ps3 = "IEX" nocase
    $ps4 = "Invoke-Expression" nocase
    $ps5 = "-EncodedCommand" nocase
  condition:
    2 of them
}

rule VBA_Macro_AutoExec {
  meta:
    description = "VBA macro with auto-exec entry points"
    severity = "HIGH"
  strings:
    $a1 = "AutoOpen"
    $a2 = "AutoClose"
    $a3 = "Document_Open"
    $a4 = "Workbook_Open"
    $shell = "Shell("
    $wsh  = "WScript.Shell" nocase
  condition:
    any of ($a*) and any of ($shell, $wsh)
}

rule PE_Suspicious_Section_Names {
  meta:
    description = "PE binary with known packer/obfuscator section names"
    severity = "MEDIUM"
  strings:
    $s1 = ".themida"
    $s2 = ".netshrink"
    $s3 = ".packed"
    $s4 = "UPX0"
    $s5 = "UPX1"
  condition:
    uint16(0) == 0x5A4D and any of them
}

rule Credential_Harvester_Keywords {
  meta:
    description = "Script-like file containing credential harvesting patterns"
    severity = "HIGH"
  strings:
    $k1 = "GetAsyncKeyState" nocase
    $k2 = "SetWindowsHookEx" nocase
    $k3 = "credential" nocase
    $k4 = "password" nocase
    $k5 = "keylogger" nocase
  condition:
    3 of them
}

rule ZIP_Bomb_Indicator {
  meta:
    description = "Possible ZIP bomb: deeply nested or abnormal compression ratio"
    severity = "CRITICAL"
  strings:
    $pk = { 50 4B 03 04 }
  condition:
    #pk > 100
}

rule Suspicious_JS_Obfuscation {
  meta:
    description = "Heavily obfuscated JavaScript"
    severity = "MEDIUM"
  strings:
    $e1 = "eval(" nocase
    $e2 = "unescape(" nocase
    $e3 = "String.fromCharCode" nocase
    $e4 = "atob(" nocase
    $hex = /\\x[0-9a-fA-F]{2}(\s*,\s*\\x[0-9a-fA-F]{2}){20,}/
  condition:
    2 of ($e*) or $hex
}
