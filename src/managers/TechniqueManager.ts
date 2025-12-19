import { Technique, TechniqueCategory, PriorityLevel, TechniqueMode, TechniqueModeValidationResult } from '../types'

export class TechniqueManager {
  private techniques: Technique[] = []
  private isInitialized: boolean = false

  async init(): Promise<void> {
    this.loadTechniques()
    this.isInitialized = true
  }

  private loadTechniques(): void {
      this.techniques = [
          // Punches

          { name: 'Left Uppercot', file: 'smol-makat-snukeret.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Uppercot', file: 'yamin-makat-snukeret.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Hook', file: 'smol-magal-la-rosh.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Hook', file: 'yamin-magal-la-rosh.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },

          { name: 'Left Straight Punch', file: 'smol-egrof-lefanim.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Straight Punch', file: 'yamin-egrof-lefanim.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING']   },
          { name: 'Left Back Fist', file: 'smol-makat-gav-yad.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Back Fist', file: 'yamin-makat-gav-yad.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Head Left Right', file: 'rosh-smol-yamin.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          // { name: 'Cross Body Punch', file: 'smol-beitat-magal-gvoa.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT' },
          // { name: 'Hook Punch', file: 'smol-beitat-magal-gvoa.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          // { name: 'Uppercut Punch', file: 'smol-beitat-magal-gvoa.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' }, 

          // // Strikes
          // { name: 'Palm Heel Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
          // { name: 'Hammer Fist', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          // { name: 'Elbow Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          // { name: 'Eye Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'high', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          // { name: 'Knife Hand Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'NECK', side: 'LEFT' },

          // Kicks
          { name: 'Left High Front Kick', file: 'smol-beita-regila-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right High Front Kick', file: 'yamin-beita-regila-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Middle Front Kick', file: 'smol-beita-regila-la-guf.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Middle Front Kick', file: 'yamin-beita-regila-la-guf.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Round Kick High ', file: 'yamin-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Round Kick High ', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Low Kick ', file: 'yamin-beitat-magal-hitsonit-nemuha.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HIP', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Low Kick ', file: 'smol-beitat-magal-nitsonit-nemuha.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HIP', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },

          { name: 'Left Question Mark Kick', file: 'smol-beitat-magal-be-hataya.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Question Mark Kick', file: 'yamin-beitat-magal-be-hataya.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Back Round House Kick', file: 'smol-beitat-magal-le-ahor.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Back Round House Kick', file: 'yamin-beitat-magal-le-ahor.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Axe Kick', file: 'smol-beitat-patish.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Axe Kick', file: 'yamin-beitat-patish.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Turn Back Round House Kick', file: 'smol-beitat-magal-leahor-besivuv.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Turn Back Round House Kick', file: 'yamin-beitat-magal-leahor-besivuv.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },

          { name: 'Left Underhook Front Kick', file: 'smol-gziza-kidmit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Underhook Front Kick', file: 'yamin-gziza-kidmit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Underhook Back Kick', file: 'smol-gziza-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Right Underhook Back Kick', file: 'yamin-gziza-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
          { name: 'Left Underhook Back  And Front Kick', file: 'smol-gziza-kidmit-ve-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'LEFT', modes: ['PERFORMING'] },
          { name: 'Right Underhook Back  And Front Kick', file: 'yamin-gziza-kidmit-ve-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'RIGHT', modes: ['PERFORMING'] },

          // { name: 'Heel Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'SHIN', side: 'RIGHT' },

          // { name: 'Spinning Outside Slap Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'low', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' }

          //Kinfe
          { name: 'Left Hand Knife Top Back Attack', file: 'smol-dkirat-gav-mi-lemala.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'LEFT', modes: ['RESPONDING'] },
          { name: 'Right Hand Knife Top Back Attack', file: 'yamin-dkirat-gav-mi-lemamala.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'RIGHT', modes: ['RESPONDING'] },

          { name: 'Left Hand Knife Oriental Back Attack', file: 'smol-dkira-mizrahit-mi-ahor.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'LEFT', modes: ['RESPONDING'] },
          { name: 'Right Hand Knife Oriental Back Attack', file: 'yamin-dkira-mizrahit-mi-ahor.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'RIGHT', modes: ['RESPONDING'] },
      

      // Hand-Grip
      { name: 'Left Hand Grip', file: 'smol-tfisat-yad-mul-yad.wav', category: 'Hand-Grip', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT', modes: ['PERFORMING', 'RESPONDING'] },
      { name: 'Right Hand Grip', file: 'yamin-tfisat-yad-mul-yad.wav', category: 'Hand-Grip', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT', modes: ['PERFORMING', 'RESPONDING'] },
      
      // Knees
      // { name: 'Vertical Knee Strike', file: 'vertical_knee_strike.wav', category: 'Knees', priority: 'medium', selected: true, weight: 1, targetLevel: 'GROIN', side: 'RIGHT' },
      
      // // Defenses/Grabs
      // { name: 'Defense Against Front Choke', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'NECK', side: 'RIGHT' },
      // { name: 'Defense Against Side Headlock', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      // { name: 'Defense Against Bear Hug', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
      // { name: 'Escape From Mount', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT' },
      
      // // Weapons
      // { name: 'Defense Against Knife Stab', file: 'smol-beitat-magal-gvoa.wav', category: 'Weapons', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
      // { name: 'Defense Against Gun Front', file: 'smol-beitat-magal-gvoa.wav', category: 'Weapons', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' }
    ]
  }

  getTechniques(): Technique[] {
    return [...this.techniques]
  }

  getTechniquesByCategory(category: TechniqueCategory): Technique[] {
    return this.techniques.filter(t => t.category === category)
  }

  /**
   * Returns all techniques that support the given mode
   * @param mode The mode to filter by (PERFORMING or RESPONDING)
   */
  getTechniquesByMode(mode: TechniqueMode): Technique[] {
    return this.techniques.filter(t => t.modes && t.modes.includes(mode))
  }

  /**
   * Returns the modes supported by a technique with the given name
   * @param techniqueName The name of the technique
   */
  getTechniqueModes(techniqueName: string): TechniqueMode[] {
    const technique = this.techniques.find(t => t.name === techniqueName)
    return technique ? technique.modes : []
  }

  /**
   * Updates the modes for a technique with the given name
   * @param techniqueName The name of the technique
   * @param modes The new modes to set
   */
  updateTechniqueModes(techniqueName: string, modes: TechniqueMode[]): void {
    const technique = this.techniques.find(t => t.name === techniqueName)
    if (technique) {
      technique.modes = modes
    }
  }

  /**
   * Validates if a technique supports a given mode
   * @param technique The technique to validate
   * @param mode The mode to check
   * @returns TechniqueModeValidationResult
   */
  validateTechniqueMode(technique: Technique, mode: TechniqueMode): TechniqueModeValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    if (!technique.modes || !Array.isArray(technique.modes) || technique.modes.length === 0) {
      errors.push('Technique must support at least one mode')
    } else if (!technique.modes.includes(mode)) {
      errors.push(`Technique does not support mode: ${mode}`)
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      techniqueId: technique.name,
      mode
    }
  }

  updateTechniquePriority(name: string, priority: PriorityLevel): void {
    const technique = this.techniques.find(t => t.name === name)
    if (technique) {
      technique.priority = priority
    }
  }

  updateTechniqueSelection(name: string, selected: boolean): void {
    const technique = this.techniques.find(t => t.name === name)
    if (technique) {
      technique.selected = selected
    }
  }

  selectAllTechniques(): void {
    this.techniques.forEach(t => t.selected = true)
  }

  deselectAllTechniques(): void {
    this.techniques.forEach(t => t.selected = false)
  }

  getSelectedTechniques(): Technique[] {
    return this.techniques.filter(t => t.selected)
  }

  isReady(): boolean {
    return this.isInitialized
  }
}
