<?php

require __DIR__.'/../backend/vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

date_default_timezone_set('Europe/Paris');

$root = realpath(__DIR__.'/..');
$umlDir = $root.DIRECTORY_SEPARATOR.'UML';
if (! is_dir($umlDir)) {
    mkdir($umlDir, 0777, true);
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function txt(int $x, int $y, string $value, string $anchor = 'middle', int $size = 13, string $weight = 'normal', string $color = '#111827'): string
{
    $out = '';
    foreach (explode("\n", $value) as $i => $line) {
        $out .= '<text x="'.$x.'" y="'.($y + ($i * ($size + 3))).'" text-anchor="'.$anchor.'" font-size="'.$size.'" font-weight="'.$weight.'" fill="'.$color.'">'.e($line).'</text>';
    }

    return $out;
}

function lineSvg(int $x1, int $y1, int $x2, int $y2, string $color = '#111827', string $extra = ''): string
{
    return '<line x1="'.$x1.'" y1="'.$y1.'" x2="'.$x2.'" y2="'.$y2.'" stroke="'.$color.'" stroke-width="1.4" '.$extra.'/>';
}

function actorSvg(int $x, int $y, string $name): string
{
    return '<circle cx="'.$x.'" cy="'.$y.'" r="13" fill="white" stroke="#111827" stroke-width="1.6"/>'
        .lineSvg($x, $y + 13, $x, $y + 58)
        .lineSvg($x - 28, $y + 31, $x + 28, $y + 31)
        .lineSvg($x, $y + 58, $x - 25, $y + 93)
        .lineSvg($x, $y + 58, $x + 25, $y + 93)
        .txt($x, $y + 118, $name, 'middle', 13, 'bold');
}

function useCaseSvg(int $cx, int $cy, int $rx, int $ry, string $label): string
{
    return '<ellipse cx="'.$cx.'" cy="'.$cy.'" rx="'.$rx.'" ry="'.$ry.'" fill="white" stroke="#111827" stroke-width="1.5"/>'
        .txt($cx, $cy - (str_contains($label, "\n") ? 8 : 0), $label, 'middle', 12, 'bold');
}

function assoc(int $x1, int $y1, int $x2, int $y2): string
{
    return lineSvg($x1, $y1, $x2, $y2, '#374151');
}

function dashedArrow(int $x1, int $y1, int $x2, int $y2, string $label): string
{
    $mx = intdiv($x1 + $x2, 2);
    $my = intdiv($y1 + $y2, 2) - 8;

    return lineSvg($x1, $y1, $x2, $y2, '#dc2626', 'stroke-dasharray="6 5" marker-end="url(#redArrow)"')
        .txt($mx, $my, $label, 'middle', 11, 'bold', '#dc2626');
}

function useCaseDiagram(): string
{
    $s = '<svg viewBox="0 0 1180 760" width="100%" height="680" xmlns="http://www.w3.org/2000/svg">';
    $s .= '<defs><marker id="redArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#dc2626"/></marker></defs>';
    $s .= '<rect width="1180" height="760" fill="#ffffff"/>';
    $s .= '<rect x="210" y="42" width="760" height="650" fill="#f9fafb" stroke="#111827" stroke-width="1.8"/>';
    $s .= txt(245, 72, '<<Système>>', 'start', 12, 'normal');
    $s .= txt(245, 94, 'BOON', 'start', 18, 'bold');

    $s .= actorSvg(95, 115, 'Visiteur');
    $s .= actorSvg(95, 330, "Propriétaire");
    $s .= actorSvg(95, 555, 'Ouvrier');
    $s .= actorSvg(1080, 305, 'Fournisseur');
    $s .= actorSvg(1080, 545, "Service PDF\n/ WhatsApp");

    $cases = [
        'auth' => [420, 125, 115, 37, "S'inscrire /\nse connecter"],
        'verify' => [720, 125, 120, 37, "Vérifier le\ntéléphone"],
        'profile' => [570, 215, 125, 37, "Gérer profil\nutilisateur"],
        'createRoom' => [390, 320, 120, 37, 'Créer une room'],
        'joinRoom' => [730, 320, 130, 37, "Demander accès\nà une room"],
        'decideJoin' => [390, 430, 130, 37, "Accepter / refuser\nune demande"],
        'linkSupplier' => [730, 430, 142, 37, "Lier fournisseur\nà un ouvrier"],
        'sendBoon' => [390, 545, 132, 37, "Envoyer un bon\nà la room"],
        'personalDoc' => [730, 545, 132, 37, "Créer document\npersonnel"],
        'consult' => [390, 645, 132, 37, "Consulter flux,\ntotaux et docs"],
        'share' => [730, 645, 132, 37, "Partager /\nexporter PDF"],
    ];
    foreach ($cases as $c) {
        $s .= useCaseSvg($c[0], $c[1], $c[2], $c[3], $c[4]);
    }

    $s .= assoc(130, 185, 300, 125);
    $s .= assoc(130, 400, 275, 320);
    $s .= assoc(130, 400, 265, 430);
    $s .= assoc(130, 625, 610, 320);
    $s .= assoc(130, 625, 595, 430);
    $s .= assoc(130, 625, 278, 645);
    $s .= assoc(1042, 375, 520, 545);
    $s .= assoc(1042, 375, 598, 545);
    $s .= assoc(1042, 375, 520, 645);
    $s .= assoc(1042, 375, 598, 645);
    $s .= assoc(1042, 615, 862, 645);

    $s .= dashedArrow(530, 125, 600, 125, '<<include>>');
    $s .= dashedArrow(495, 145, 535, 195, '<<include>>');
    $s .= dashedArrow(498, 545, 598, 545, '<<extend>>');
    $s .= dashedArrow(820, 625, 865, 575, '<<include>>');
    $s .= dashedArrow(855, 430, 960, 385, '<<include>>');

    $s .= txt(590, 730, "Diagramme de cas d'utilisation BOON", 'middle', 15, 'bold');
    $s .= '</svg>';

    return $s;
}

function classBox(int $x, int $y, int $w, string $name, array $attrs, array $methods = []): string
{
    $attrHeight = max(28, count($attrs) * 16 + 16);
    $methHeight = max(22, count($methods) * 16 + 14);
    $h = 36 + $attrHeight + $methHeight;
    $s = '<rect x="'.$x.'" y="'.$y.'" width="'.$w.'" height="'.$h.'" fill="#ffffff" stroke="#111827" stroke-width="1.4"/>';
    $s .= '<rect x="'.$x.'" y="'.$y.'" width="'.$w.'" height="36" fill="#eef2ff" stroke="#111827" stroke-width="1.4"/>';
    $s .= txt($x + intdiv($w, 2), $y + 23, $name, 'middle', 13, 'bold');
    $s .= lineSvg($x, $y + 36, $x + $w, $y + 36);
    $ay = $y + 56;
    foreach ($attrs as $attr) {
        $s .= txt($x + 10, $ay, $attr, 'start', 11);
        $ay += 16;
    }
    $sep = $y + 36 + $attrHeight;
    $s .= lineSvg($x, $sep, $x + $w, $sep);
    $my = $sep + 18;
    foreach ($methods as $method) {
        $s .= txt($x + 10, $my, $method, 'start', 11);
        $my += 16;
    }

    return $s;
}

function rel(int $x1, int $y1, int $x2, int $y2, string $left = '', string $right = '', string $label = ''): string
{
    $s = lineSvg($x1, $y1, $x2, $y2, '#111827');
    if ($left !== '') {
        $s .= txt($x1 + 8, $y1 - 6, $left, 'start', 11, 'bold');
    }
    if ($right !== '') {
        $s .= txt($x2 - 8, $y2 - 6, $right, 'end', 11, 'bold');
    }
    if ($label !== '') {
        $s .= txt(intdiv($x1 + $x2, 2), intdiv($y1 + $y2, 2) - 8, $label, 'middle', 11, 'normal', '#374151');
    }

    return $s;
}

function classDiagram(): string
{
    $s = '<svg viewBox="0 0 1180 820" width="100%" height="720" xmlns="http://www.w3.org/2000/svg">';
    $s .= '<rect width="1180" height="820" fill="#ffffff"/>';
    $s .= txt(590, 32, 'Diagramme de classes BOON', 'middle', 18, 'bold');

    $s .= classBox(40, 70, 220, 'Utilisateur', [
        '- id : UUID',
        '- téléphone : string',
        '- email : string?',
        '- motDePasseHash : string',
        '- nomComplet : string',
        '- rôleDéfaut : Role',
        '- statut : UserStatus',
    ], [
        '+ estActif() : bool',
        '+ téléphoneVérifié() : bool',
    ]);
    $s .= classBox(330, 70, 220, 'Room', [
        '- id : UUID',
        '- nom : string',
        '- codeRoom : string',
        '- statut : RoomStatus',
        '- ownerId : UUID',
        '- dernièreActivité : datetime?',
    ], [
        '+ estActive() : bool',
        '+ calculerTotaux()',
    ]);
    $s .= classBox(635, 70, 245, 'MembreRoom', [
        '- id : UUID',
        '- roomId : UUID',
        '- userId : UUID',
        '- rôle : Role',
        '- lastSeenAt : datetime?',
    ], [
        '+ marquerCommeLu()',
    ]);
    $s .= classBox(940, 70, 205, 'DemandeAdhésion', [
        '- id : UUID',
        '- roomId : UUID',
        '- workerId : UUID',
        '- statut : JoinStatus',
        '- requestedAt : datetime',
        '- decidedAt : datetime?',
    ], [
        '+ accepter()',
        '+ refuser()',
    ]);
    $s .= classBox(50, 360, 245, 'ProfilMagasinFournisseur', [
        '- id : UUID',
        '- supplierId : UUID',
        '- nomMagasin : string',
        '- téléphone : string',
        '- adresse : string',
        '- ice : string?',
        '- rc : string?',
    ], [
        '+ mettreAJour()',
    ]);
    $s .= classBox(360, 360, 250, 'LienOuvrierFournisseur', [
        '- id : UUID',
        '- roomId : UUID',
        '- workerId : UUID',
        '- supplierId : UUID',
        '- statut : LinkStatus',
        '- lastActivityAt : datetime?',
    ], [
        '+ activer()',
        '+ désactiver()',
    ]);
    $s .= classBox(690, 330, 245, 'Document', [
        '- id : UUID',
        '- type : DocumentType',
        '- roomId : UUID?',
        '- workerId : UUID?',
        '- supplierId : UUID',
        '- montantTotal : decimal',
        '- catégorie : string?',
        '- note : text?',
        '- personnel : bool',
        '- immutable : bool',
    ], [
        '+ générerPDF()',
        '+ partagerWhatsApp()',
    ]);
    $s .= classBox(690, 625, 210, 'LigneDocument', [
        '- id : UUID',
        '- documentId : UUID',
        '- produit : string',
        '- quantité : decimal',
        '- prixUnitaire : decimal',
        '- totalLigne : decimal',
    ], [
        '+ calculerTotal()',
    ]);
    $s .= classBox(955, 625, 185, 'PièceJointe', [
        '- id : UUID',
        '- documentId : UUID',
        '- fileUrl : string',
        '- mimeType : string',
        '- createdAt : datetime',
    ]);

    $s .= rel(260, 150, 330, 150, '1', '0..*', 'possède');
    $s .= rel(550, 150, 635, 150, '1', '0..*', 'contient');
    $s .= rel(260, 175, 635, 175, '1', '0..*', 'participe');
    $s .= rel(550, 225, 940, 160, '1', '0..*', 'reçoit');
    $s .= rel(260, 455, 50, 455, '1', '0..1', 'profil');
    $s .= rel(550, 450, 610, 450, '1', '0..*', 'scope');
    $s .= rel(610, 450, 690, 435, '1', '0..*', 'autorise');
    $s .= rel(880, 470, 935, 470, '0..1', '1', 'lié à');
    $s .= rel(810, 590, 810, 625, '1', '0..*', 'détaille');
    $s .= rel(905, 590, 1010, 625, '1', '0..*', 'joint');
    $s .= rel(610, 505, 690, 505, '1', '0..*', 'crée');

    $s .= txt(590, 795, 'Cardinalités et associations principales du modèle métier', 'middle', 13, 'bold');
    $s .= '</svg>';

    return $s;
}

function sequenceDiagram(string $title, array $participants, array $messages): string
{
    $count = count($participants);
    $left = 70;
    $gap = intdiv(1040, max(1, $count - 1));
    $height = 170 + count($messages) * 42;
    $xs = [];
    foreach ($participants as $i => $p) {
        $xs[$p[0]] = $left + $i * $gap;
    }

    $s = '<svg viewBox="0 0 1180 '.$height.'" width="100%" height="'.min($height, 720).'" xmlns="http://www.w3.org/2000/svg">';
    $s .= '<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#111827"/></marker></defs>';
    $s .= '<rect width="1180" height="'.$height.'" fill="#ffffff"/>';
    $s .= txt(590, 32, $title, 'middle', 18, 'bold');

    foreach ($participants as $p) {
        $x = $xs[$p[0]];
        $s .= '<rect x="'.($x - 65).'" y="58" width="130" height="34" fill="#eef2ff" stroke="#111827" stroke-width="1.4"/>';
        $s .= txt($x, 80, $p[1], 'middle', 12, 'bold');
        $s .= lineSvg($x, 92, $x, $height - 35, '#6b7280', 'stroke-dasharray="5 5"');
    }

    $y = 125;
    $n = 1;
    foreach ($messages as $m) {
        [$from, $to, $label, $type] = [$m[0], $m[1], $m[2], $m[3] ?? 'call'];
        $x1 = $xs[$from];
        $x2 = $xs[$to];
        if ($from === $to) {
            $s .= '<path d="M '.$x1.' '.$y.' C '.($x1 + 85).' '.$y.', '.($x1 + 85).' '.($y + 25).', '.$x1.' '.($y + 25).'" fill="none" stroke="#111827" stroke-width="1.4" marker-end="url(#arrow)"/>';
            $s .= txt($x1 + 95, $y + 5, $n.'. '.$label, 'start', 11);
            $y += 42;
            $n++;
            continue;
        }
        $dash = $type === 'return' ? 'stroke-dasharray="5 5"' : 'marker-end="url(#arrow)"';
        $color = $type === 'return' ? '#6b7280' : '#111827';
        $s .= lineSvg($x1, $y, $x2, $y, $color, $dash);
        $s .= txt(intdiv($x1 + $x2, 2), $y - 7, $n.'. '.$label, 'middle', 11);
        $y += 42;
        $n++;
    }
    $s .= '</svg>';

    return $s;
}

$pages = [
    ['diagramme_cas_utilisation', 'Diagramme de cas d’utilisation', useCaseDiagram()],
    ['diagramme_classes', 'Diagramme de classes', classDiagram()],
    ['sequence_1_authentification', 'Séquence 1 - Authentification et vérification', sequenceDiagram('Authentification et vérification du téléphone', [
        ['u', 'Utilisateur'], ['f', 'Interface web'], ['api', 'API Authentification'], ['db', 'Base de données'],
    ], [
        ['u', 'f', 'saisir informations de compte'],
        ['f', 'api', 'POST /auth/register'],
        ['api', 'api', 'valider rôle et mot de passe'],
        ['api', 'db', 'créer utilisateur + code'],
        ['api', 'f', 'verificationRequired', 'return'],
        ['u', 'f', 'saisir code'],
        ['f', 'api', 'POST /auth/verify-phone'],
        ['api', 'db', 'valider code + créer token'],
        ['api', 'f', 'token + utilisateur', 'return'],
    ])],
    ['sequence_2_room_ouvrier', 'Séquence 2 - Room et demande ouvrier', sequenceDiagram('Création de room et adhésion d’un ouvrier', [
        ['p', 'Propriétaire'], ['o', 'Ouvrier'], ['f', 'Interface web'], ['api', 'API Rooms'], ['db', 'Base de données'],
    ], [
        ['p', 'f', 'créer room'],
        ['f', 'api', 'POST /rooms'],
        ['api', 'db', 'rooms + membre OWNER'],
        ['api', 'f', 'code room', 'return'],
        ['o', 'f', 'saisir code room'],
        ['f', 'api', 'POST /rooms/join'],
        ['api', 'db', 'demande PENDING'],
        ['p', 'f', 'accepter demande'],
        ['f', 'api', 'POST /join-requests/{id}/decision'],
        ['api', 'db', 'membre WORKER'],
        ['api', 'f', 'demande acceptée', 'return'],
    ])],
    ['sequence_3_liaison_fournisseur', 'Séquence 3 - Liaison fournisseur', sequenceDiagram('Liaison fournisseur avec un ouvrier', [
        ['o', 'Ouvrier'], ['f', 'Interface web'], ['api', 'API Fournisseurs'], ['db', 'Base de données'], ['s', 'Fournisseur'],
    ], [
        ['o', 'f', 'rechercher fournisseur'],
        ['f', 'api', 'GET /users/suppliers'],
        ['api', 'db', 'filtrer rôle SUPPLIER'],
        ['api', 'f', 'liste fournisseurs', 'return'],
        ['o', 'f', 'choisir fournisseur'],
        ['f', 'api', 'POST /rooms/{id}/suppliers'],
        ['api', 'db', 'vérifier room active et ouvrier membre'],
        ['api', 'db', 'créer membre SUPPLIER'],
        ['api', 'db', 'créer lien ACTIVE'],
        ['api', 'f', 'lien confirmé', 'return'],
        ['s', 'f', 'voit son ouvrier lié'],
    ])],
    ['sequence_4_bon_pdf', 'Séquence 4 - Envoi et export du bon', sequenceDiagram('Envoi d’un bon puis export PDF', [
        ['s', 'Fournisseur'], ['f', 'Interface web'], ['api', 'API Documents'], ['db', 'Base de données'], ['pdf', 'Dompdf'],
    ], [
        ['s', 'f', 'saisir montant, catégorie, note'],
        ['f', 'api', 'POST /rooms/{id}/documents'],
        ['api', 'db', 'vérifier lien ouvrier-fournisseur'],
        ['api', 'db', 'insérer document + lignes + pièces'],
        ['api', 'f', 'document créé', 'return'],
        ['s', 'f', 'demander export PDF'],
        ['f', 'api', 'POST /documents/{id}/export-pdf'],
        ['api', 'pdf', 'générer PDF'],
        ['api', 'f', 'URL PDF', 'return'],
    ])],
];

$html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@page { margin: 20px; }
body { font-family: DejaVu Sans, Arial, sans-serif; color:#111827; }
.cover { text-align:center; padding-top:160px; }
.cover h1 { font-size:34px; margin:0 0 12px; }
.cover h2 { font-size:21px; font-weight:normal; margin:0 0 60px; }
.meta { margin:0 auto; border-collapse:collapse; width:78%; font-size:13px; }
.meta td { border:1px solid #9ca3af; padding:10px; text-align:left; }
.page { page-break-before:always; }
h2 { margin:0 0 8px; font-size:21px; }
.note { margin-top:8px; font-size:11px; border:1px solid #d1d5db; padding:8px; background:#f9fafb; }
svg { display:block; margin:0 auto; }
</style></head><body>';

$html .= '<section class="cover"><h1>Diagrammes UML - Projet BOON</h1><h2>Cas d’utilisation, classes et séquences</h2><table class="meta">';
$html .= '<tr><td><strong>Système</strong></td><td>BOON - gestion de rooms, bons, fournisseurs et documents PDF</td></tr>';
$html .= '<tr><td><strong>Acteurs</strong></td><td>Visiteur, Propriétaire, Ouvrier, Fournisseur, Service PDF/WhatsApp</td></tr>';
$html .= '<tr><td><strong>Notation</strong></td><td>UML standard avec frontière système, acteurs, cas, classes, cardinalités et lignes de vie</td></tr>';
$html .= '<tr><td><strong>Date</strong></td><td>'.date('d/m/Y').'</td></tr>';
$html .= '</table></section>';

foreach ($pages as [$slug, $title, $body]) {
    file_put_contents($umlDir.DIRECTORY_SEPARATOR.$slug.'.svg', $body);
    $html .= '<section class="page"><h2>'.e($title).'</h2>'.$body;
    $html .= '<div class="note"><strong>Contexte BOON :</strong> le Propriétaire gère les rooms, l’Ouvrier relie les fournisseurs à son périmètre, et le Fournisseur crée les bons visibles selon les droits de la room.</div></section>';
}
$html .= '</body></html>';

$htmlPath = $umlDir.DIRECTORY_SEPARATOR.'boon_uml_diagrammes.html';
$pdfPath = $umlDir.DIRECTORY_SEPARATOR.'boon_uml_diagrammes.pdf';
file_put_contents($htmlPath, $html);

$options = new Options();
$options->set('defaultFont', 'DejaVu Sans');
$options->set('isHtml5ParserEnabled', true);
$options->set('isRemoteEnabled', false);

$dompdf = new Dompdf($options);
$dompdf->loadHtml($html, 'UTF-8');
$dompdf->setPaper('A4', 'landscape');
$dompdf->render();
file_put_contents($pdfPath, $dompdf->output());

echo "PDF genere : {$pdfPath}\n";
echo "HTML source : {$htmlPath}\n";
