<?php

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';
$msisdn = $input['msisdn'] ?? '';

if (!$token || !$msisdn) {
    echo json_encode(['success' => false, 'message' => 'Missing token or phone number']);
    exit;
}

try {
    // Mytel API ကို call လုပ်ပြီး point ယူခြင်း
    $api_url = 'https://apis.mytel.com.mm/loyalty/api/v3.1/point/claim';
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $api_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'msisdn' => $msisdn,
            'requestId' => uniqid(),
            'requestTime' => time()
        ])
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        $data = json_decode($response, true);
        if ($data['errorCode'] === '00000') {
            echo json_encode([
                'success' => true,
                'message' => 'Points claimed successfully!'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => $data['message'] ?? 'Claim failed'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'API request failed'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>