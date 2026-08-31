import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LayoutShellComponent } from './design-system/layout-shell.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LayoutShellComponent, RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {}
