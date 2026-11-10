import { Component, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface ReceiptViewerData {
  fileName: string;
  blob: Blob;
}

/**
 * Shows a receipt that was downloaded as a Blob.
 * Why a Blob? The receipt endpoint needs the JWT, and <img src="/api/..."> cannot send
 * an Authorization header. So we fetch it with HttpClient (interceptor adds the token),
 * turn it into a temporary object URL, and display that.
 */
@Component({
  selector: 'app-receipt-viewer-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.fileName }}</h2>
    <mat-dialog-content class="receipt-viewer">
      @if (isPdf) {
        <iframe [src]="safeUrl" title="Receipt PDF"></iframe>
      } @else {
        <img [src]="safeUrl" [alt]="data.fileName" />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <a mat-button [href]="safeUrl" [attr.download]="data.fileName">Download</a>
      <button mat-flat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
})
export class ReceiptViewerDialog implements OnDestroy {
  readonly data = inject<ReceiptViewerData>(MAT_DIALOG_DATA);
  private readonly objectUrl = URL.createObjectURL(this.data.blob);

  readonly isPdf = this.data.blob.type === 'application/pdf';
  // Object URLs are created by our own code from our own API response, so they are trusted.
  readonly safeUrl: SafeResourceUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(this.objectUrl);

  ngOnDestroy(): void {
    URL.revokeObjectURL(this.objectUrl); // free the memory
  }
}
