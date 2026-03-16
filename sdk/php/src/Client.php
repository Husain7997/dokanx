<?php

class DokanXClient
{
    private $baseUrl;
    private $apiKey;

    public function __construct($baseUrl, $apiKey)
    {
        $this->baseUrl = rtrim($baseUrl ?? "http://localhost:5001/api/v1", "/");
        $this->apiKey = $apiKey;
    }

    private function request($path, $method = "GET", $body = null)
    {
        $url = $this->baseUrl . $path;
        $headers = [
            "Content-Type: application/json",
            "x-api-key: " . $this->apiKey,
        ];

        $options = [
            "http" => [
                "method" => $method,
                "header" => implode("\r\n", $headers),
                "content" => $body ? json_encode($body) : null,
            ]
        ];

        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);
        if ($response === false) {
            throw new Exception("Request failed");
        }
        return json_decode($response, true);
    }

    public function listProducts($shopId = null)
    {
        $query = $shopId ? "?shopId=" . urlencode($shopId) : "";
        return $this->request("/products" . $query);
    }

    public function createOrder($payload)
    {
        return $this->request("/orders", "POST", $payload);
    }
}
