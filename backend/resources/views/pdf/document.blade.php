<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; margin: 24px; }
        .header { border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
        .brand { color: #b45309; font-size: 11px; font-weight: bold; letter-spacing: 0.25em; text-transform: uppercase; }
        .title { font-size: 24px; font-weight: bold; margin: 8px 0 4px; }
        .muted { color: #6b7280; }
        .summary { background: #111827; color: #f9fafb; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
        .summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; }
        .summary-total { font-size: 26px; font-weight: bold; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
        th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; }
        .right { text-align: right; }
        .section-title { font-size: 14px; font-weight: bold; margin: 20px 0 8px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">BOON</div>
        <div class="title">{{ $document['storeProfile']['storeName'] ?? 'BOON' }}</div>
        <div class="muted">{{ $document['storeProfile']['address'] ?? '-' }}</div>
        <div class="muted">Phone: {{ $document['storeProfile']['phone'] ?? '-' }}</div>
        @if(!empty($document['storeProfile']['ice']))
            <div class="muted">ICE: {{ $document['storeProfile']['ice'] }}</div>
        @endif
        @if(!empty($document['storeProfile']['rc']))
            <div class="muted">RC: {{ $document['storeProfile']['rc'] }}</div>
        @endif
        <div style="margin-top: 10px;">
            <strong>Document:</strong> {{ $document['type'] }}<br>
            <strong>Created:</strong> {{ str_replace('T', ' ', substr($document['createdAt'] ?? '', 0, 19)) }}<br>
            <strong>Supplier:</strong> {{ $document['supplier']['fullName'] ?? '-' }}
        </div>
    </div>

    <div class="summary">
        <div class="summary-label">Total Amount</div>
        <div class="summary-total">{{ number_format((float) $document['grandTotal'], 2, '.', ',') }} {{ $document['currency'] }}</div>
        <div style="margin-top: 8px;">
            <strong>Category:</strong> {{ $document['category'] ?: $document['type'] }}<br>
            <strong>Note:</strong> {{ $document['note'] ?: '-' }}
        </div>
    </div>

    <div class="section-title">Items</div>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th class="right">Qty</th>
                <th>Unit</th>
                <th class="right">Unit Price</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @forelse($document['items'] as $item)
                <tr>
                    <td>{{ $item['productName'] }}</td>
                    <td class="right">{{ number_format((float) $item['qty'], 2, '.', ',') }}</td>
                    <td>{{ $item['unit'] ?: '-' }}</td>
                    <td class="right">{{ number_format((float) $item['unitPrice'], 2, '.', ',') }}</td>
                    <td class="right">{{ number_format((float) $item['lineTotal'], 2, '.', ',') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5">Quick amount document</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if(!empty($document['attachments']))
        <div class="section-title">Attachments</div>
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                @foreach($document['attachments'] as $attachment)
                    <tr>
                        <td>{{ $attachment['fileUrl'] }}</td>
                        <td>{{ $attachment['mimeType'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if(!empty($document['storeProfile']['footerNote']))
        <div class="section-title">Footer Note</div>
        <div>{{ $document['storeProfile']['footerNote'] }}</div>
    @endif
</body>
</html>
