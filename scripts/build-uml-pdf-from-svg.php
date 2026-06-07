<?php

require __DIR__.'/../backend/vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

date_default_timezone_set('Europe/Paris');

$root = realpath(__DIR__.'/..');
$umlDir = $root.DIRECTORY_SEPARATOR.'UML';

$svgPages = [
    ['file' => 'diagramme_cas_utilisation.svg', 'title' => 'Diagramme de cas d’utilisation'],
    ['file' => 'diagramme_classes.svg', 'title' => 'Diagramme de classes'],
    ['file' => 'sequence_1_authentification.svg', 'title' => 'Séquence 1 - Authentification et vérification'],
    ['file' => 'sequence_2_room_ouvrier.svg', 'title' => 'Séquence 2 - Room et demande ouvrier'],
    ['file' => 'sequence_3_liaison_fournisseur.svg', 'title' => 'Séquence 3 - Liaison fournisseur'],
    ['file' => 'sequence_4_bon_pdf.svg', 'title' => 'Séquence 4 - Envoi et export du bon'],
];

function htmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function readSvg(string $path): string
{
    if (! is_file($path)) {
        throw new RuntimeException("Fichier SVG introuvable : {$path}");
    }

    $svg = file_get_contents($path);
    if ($svg === false || trim($svg) === '') {
        throw new RuntimeException("Fichier SVG vide ou illisible : {$path}");
    }

    return $svg;
}

$html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@page { margin: 18px 20px; }
body { font-family: DejaVu Sans, Arial, sans-serif; color: #111827; }
.cover { text-align: center; padding-top: 155px; }
.cover h1 { font-size: 34px; margin: 0 0 10px; }
.cover h2 { font-size: 21px; font-weight: normal; margin: 0 0 58px; }
.meta { width: 78%; margin: 0 auto; border-collapse: collapse; font-size: 13px; }
.meta td { border: 1px solid #9ca3af; padding: 10px 12px; text-align: left; }
.page { page-break-before: always; }
h2 { margin: 0 0 8px; font-size: 21px; }
.diagram { width: 100%; text-align: center; }
.diagram svg { max-width: 100%; height: auto; }
.note { margin-top: 8px; font-size: 11px; border: 1px solid #d1d5db; padding: 8px; background: #f9fafb; }
</style></head><body>';

$html .= '<section class="cover">';
$html .= '<h1>Diagrammes UML - Projet BOON</h1>';
$html .= '<h2>PDF généré à partir des fichiers SVG du dossier UML</h2>';
$html .= '<table class="meta">';
$html .= '<tr><td><strong>Système</strong></td><td>BOON - gestion de rooms, bons, fournisseurs et documents PDF</td></tr>';
$html .= '<tr><td><strong>Diagrammes</strong></td><td>Cas d’utilisation, classes et séquences</td></tr>';
$html .= '<tr><td><strong>Source</strong></td><td>Fichiers SVG séparés dans le dossier UML</td></tr>';
$html .= '<tr><td><strong>Date</strong></td><td>'.date('d/m/Y').'</td></tr>';
$html .= '</table></section>';

foreach ($svgPages as $page) {
    $svgPath = $umlDir.DIRECTORY_SEPARATOR.$page['file'];
    $html .= '<section class="page">';
    $html .= '<h2>'.htmlEscape($page['title']).'</h2>';
    $html .= '<div class="diagram">'.readSvg($svgPath).'</div>';
    $html .= '<div class="note"><strong>Source :</strong> '.htmlEscape($page['file']).'</div>';
    $html .= '</section>';
}

$html .= '</body></html>';

$htmlPath = $umlDir.DIRECTORY_SEPARATOR.'boon_uml_depuis_svg.html';
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

echo "PDF créé depuis les SVG : {$pdfPath}\n";
echo "HTML intermédiaire : {$htmlPath}\n";
