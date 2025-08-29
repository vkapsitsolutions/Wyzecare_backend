import { Controller } from '@nestjs/common';
import { CallScriptsService } from './call-scripts.service';

@Controller('call-scripts')
export class CallScriptsController {
  constructor(private readonly callScriptsService: CallScriptsService) {}
}
