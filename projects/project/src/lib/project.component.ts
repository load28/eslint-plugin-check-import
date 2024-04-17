import { Component } from '@angular/core';
import { AppComponent } from '@app/app.component';
import { AppComponent } from '../../../../src/app/app.component';

@Component({
  selector: 'lib-project',
  standalone: true,
  imports: [],
  template: ` <p>project works!</p> `,
  styles: ``,
})
export class ProjectComponent {
  constructor() {
    const a = new AppComponent();
  }
}
